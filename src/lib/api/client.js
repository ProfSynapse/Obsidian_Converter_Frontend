// src/lib/api/client.js

import { CONFIG } from '../config';
import { ConversionError, ErrorUtils } from './errors.js';
import { Converters } from './converters.js';
import { conversionStatus } from '../stores/conversionStatus.js';
import { FileStatus } from '../stores/files.js';
import { ENDPOINTS, getEndpointUrl } from './endpoints.js';
import { makeRequest } from './requestHandler.js';

/**
 * Manages file conversion operations and tracks their status
 */
class ConversionClient {
  constructor(baseUrl = CONFIG.API.BASE_URL) {
    this.activeRequests = new Map();
    this.config = CONFIG;
    this.baseUrl = baseUrl;
    this.isRailway = import.meta.env.PROD;
    // Get supported types from FILES.TYPES instead of ITEM_TYPES
    this.supportedTypes = Object.values(CONFIG.FILES.TYPES || {});
    
    // Log the API configuration
    console.log('API Configuration:', {
      baseUrl: this.baseUrl,
      isRailway: this.isRailway,
      isProd: import.meta.env.PROD
    });
  }

  /**
 * Validates and normalizes item before conversion
 * @private
 */
  /**
   * Normalizes a URL to ensure consistent format
   * @private
   */
  _normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      const normalizedPath = urlObj.pathname.replace(/\/+$/, '').toLowerCase();
      urlObj.pathname = normalizedPath;
      return urlObj.href.toLowerCase();
    } catch (error) {
      console.error('URL normalization error:', error);
      return url.toLowerCase();
    }
  }

  _validateAndNormalizeItem(item) {
    if (!item?.type) {
      throw ConversionError.validation('Invalid item: missing type');
    }
  
    const type = item.type.toLowerCase();
  
    if (!this.supportedTypes.includes(type)) {
      throw ConversionError.validation(`Unsupported type: ${type}`);
    }

    // Special validation for parent URL
    if (type === CONFIG.ITEM_TYPES.PARENT_URL && !item.url) {
      throw ConversionError.validation('Parent URL is required');
    }

    // Normalize URLs if present
    const normalizedUrl = item.url ? this._normalizeUrl(item.url) : null;
    const normalizedContent = item.content && typeof item.content === 'string' ? 
      this._normalizeUrl(item.content) : item.content;

    // Normalize the item's properties
    return {
      id: item.id || this._generateId(),
      type,
      name: item.name?.trim() || 'Untitled',
      url: normalizedUrl,
      content: normalizedContent,
      options: {
        includeImages: true,
        includeMeta: true,
        convertLinks: true,
        ...(type === CONFIG.ITEM_TYPES.PARENT_URL && {
          depth: item.options?.depth || 1,
          maxPages: item.options?.maxPages || 10
        }),
        ...item.options
      }
    };
  }

  /**
   * Generates a unique ID for items
   * @private
   */
  _generateId() {
    // Use crypto.randomUUID() if available, otherwise fallback to timestamp + random
    try {
      return crypto.randomUUID();
    } catch (e) {
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Converts a single item
   * @public
   */
  async convertItem(item, apiKey) {
    try {
      const normalizedItem = this._validateAndNormalizeItem(item);

      // Log the normalized item for debugging
      console.log('Converting normalized item:', normalizedItem);

      // Validate required properties based on type
      if (normalizedItem.type === CONFIG.ITEM_TYPES.URL && !normalizedItem.url) {
        throw ConversionError.validation('URL is required for URL conversion');
      }

      let result;
      switch (normalizedItem.type) {
        case CONFIG.ITEM_TYPES.URL:
          result = await Converters.convertUrl(normalizedItem, apiKey);
          break;
        case CONFIG.ITEM_TYPES.YOUTUBE:
          // YouTube conversion no longer requires API key
          result = await Converters.convertYoutube(normalizedItem);
          break;
        case CONFIG.ITEM_TYPES.PARENT_URL:
          result = await Converters.convertParentUrl(normalizedItem, apiKey);
          break;
        case CONFIG.ITEM_TYPES.FILE:
          result = await Converters.convertFile(normalizedItem, apiKey);
          break;
        default:
          throw ConversionError.validation(`Unsupported conversion type: ${normalizedItem.type}`);
      }

      return result;

    } catch (error) {
      console.error(`Error converting item ${item?.name || 'unknown'}:`, error);
      throw ErrorUtils.wrap(error);
    }
  }

  /**
   * Processes multiple items sequentially
   * @private
   */
  async processItemsSequentially(items, apiKey, onProgress, onItemComplete) {
    const results = [];
    const totalItems = items.length;
    let completedItems = 0;

    for (const item of items) {
      try {
        // Update progress
        if (onProgress) {
          const progress = Math.round((completedItems / totalItems) * 100);
          onProgress(progress);
        }

        const result = await this.convertItem(item, apiKey);
        results.push({ success: true, result, item });

        if (onItemComplete) {
          onItemComplete(item.id, true);
        }

      } catch (error) {
        console.error(`Error processing item ${item.name}:`, error);
        results.push({ success: false, error: ErrorUtils.wrap(error), item });

        if (onItemComplete) {
          onItemComplete(item.id, false, error);
        }
      }

      completedItems++;
    }

    // Ensure we reach 100% progress
    if (onProgress) onProgress(100);

    return results;
  }

  /**
   * Process multiple items for conversion
   * @public
   */
  /**
   * Makes a request to the API
   * @private
   */
  async makeRequest(endpoint, options) {
    const fullEndpoint = `${this.baseUrl}${endpoint}`;
    return makeRequest(fullEndpoint, options);
  }

  /**
   * Process multiple items for conversion
   * @public
   */
  async processItems(items, apiKey, options = {}) {
    if (!items?.length) {
      throw new ConversionError('No items provided for processing');
    }
  
    const { useBatch = false, onProgress, onItemComplete, getEndpoint } = options;
  
    try {
      if (useBatch) {
        return this.processBatch(items, apiKey, onProgress);
      }
  
      let progress = 0;
      const progressStep = 100 / items.length;
  
      const results = await Promise.all(items.map(async (item) => {
        try {
          const endpoint = getEndpoint?.(item) || this.getDefaultEndpoint(item);
          let result;
  
          if (item.type === 'url') {
            // Handle URL conversions
            const urlData = {
              url: item.url || item.content,
              name: item.name || 'url-conversion',
              options: item.options || {}
            };
            
            result = await this.makeRequest(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
              },
              body: JSON.stringify(urlData)
            });
          } else if (item.type === 'parent') {
            // Handle parent URL conversions
            result = await this.makeRequest(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
              },
              body: JSON.stringify({
                url: item.content,
                name: item.name,
                options: item.options
              })
            });
          } else if (item.file) {
            // Handle file uploads
            const formData = new FormData();
            formData.append('file', item.file);
            formData.append('options', JSON.stringify(item.options || {}));
  
            result = await this.makeRequest(endpoint, {
              method: 'POST',
              headers: {
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
              },
              body: formData
            });
          } else {
            throw new ConversionError('Invalid item format - must provide either a URL or file');
          }
  
          progress += progressStep;
          onProgress?.(Math.min(Math.round(progress), 100));
          onItemComplete?.(item.id, true);
          return result;
        } catch (error) {
          onItemComplete?.(item.id, false, error);
          throw error;
        }
      }));
  
      // Check if any result is a blob and return it directly for download
      const blobResult = results.find(result => result instanceof Blob);
      if (blobResult) {
        return blobResult;
      }
      
      // Otherwise return the processed results
      return results;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error instanceof ConversionError ? error : new ConversionError(error.message);
    }
  }
  
  // Helper method to get default endpoint based on item type
  getDefaultEndpoint(item) {
    const typeMap = {
      url: '/web/url',
      parent: '/web/parent-url',
      youtube: '/web/youtube',
      audio: '/multimedia/audio',
      video: '/multimedia/video',
      file: '/document/file'
    };
    return typeMap[item.type] || '/document/file';
  }
  

  async _getErrorMessage(response) {
    try {
      const data = await response.json();
      switch (response.status) {
        case 400:
          return data.message || 'Invalid file or upload interrupted';
        case 404:
          return 'Invalid API endpoint';
        case 413:
          return 'File size exceeds maximum limit of 50MB';
        case 500:
          return 'Server error during file processing';
        default:
          return data.message || 'Unknown error occurred';
      }
    } catch {
      return 'Error processing server response';
    }
  }

  async _handleSuccessResponse(response, item) {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/zip') || 
        contentType?.includes('application/octet-stream')) {
      return this._handleFileDownload(response, item);
    }

    const result = await response.json();
    if (!result.success) {
      throw new ConversionError(result.error || 'Conversion failed');
    }
    return result;
  }

  /**
   * Processes batch items
   * @public
   */
  async processBatch(items, apiKey, { onProgress, onItemComplete }) {
    if (!items?.length) {
      throw new ConversionError('No items provided for batch processing');
    }

    console.log('🚀 Starting batch conversion with items:', items.length);

    const formData = new FormData();
    const urlItems = [];

    // Separate files and URLs
    items.forEach(item => {
      if (item.file instanceof File) {
        formData.append('files', item.file);
      } else if (item.url || item.type === 'url') {
        urlItems.push({
          id: item.id,
          type: item.type,
          url: item.url || item.content,
          name: item.name,
          options: item.options
        });
      }
    });

    // Add URL items as JSON
    if (urlItems.length > 0) {
      formData.append('items', JSON.stringify(urlItems));
    }

    try {
      // makeRequest already processes the response into the appropriate format
      const result = await this.makeRequest('/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/zip, application/octet-stream'
        },
        body: formData
      });

      // Validate response type
      if (!(result instanceof Blob)) {
        throw new ConversionError(
          'Invalid response format - expected ZIP file',
          'RESPONSE_ERROR',
          { received: typeof result }
        );
      }

      console.log('✅ Batch conversion completed successfully');
      
      // Update progress and completion status
      onProgress?.(100);
      items.forEach(item => onItemComplete?.(item.id, true));
      
      return result;

    } catch (error) {
      console.error('❌ Batch conversion failed:', error);
      
      const wrappedError = error instanceof ConversionError ? 
        error : 
        new ConversionError(
          error.message || 'Batch conversion failed',
          error.code || 'BATCH_ERROR',
          error.details || null
        );

      // Update item statuses
      items.forEach(item => onItemComplete?.(item.id, false, wrappedError));
      
      throw wrappedError;
    }
  }

  getDefaultEndpoint(item) {
    const type = this.getItemType(item);
    const basePath = '/api/v1';
    
    switch(type) {
        case 'audio':
            return `${basePath}/multimedia/audio`;
        case 'video':
            return `${basePath}/multimedia/video`;
        case 'url':
            return `${basePath}/web/url`;
        case 'parent':
            return `${basePath}/web/parent-url`;
        case 'youtube':
            return `${basePath}/web/youtube`;
        default:
            return `${basePath}/document/file`;
    }
  }

  getItemType(item) {
    if (!item) return 'file';
    
    const fileType = item.file?.name.split('.').pop().toLowerCase();
    if (item.type === 'audio' || this.isAudioType(fileType)) return 'audio';
    if (item.type === 'video' || this.isVideoType(fileType)) return 'video';
    if (item.type === 'url') return 'url';
    if (item.type === 'parent') return 'parent';
    if (item.type === 'youtube') return 'youtube';
    return 'file';
  }

  isAudioType(ext) {
    return this.config.FILES.CATEGORIES.audio.includes(ext);
  }

  isVideoType(ext) {
    return this.config.FILES.CATEGORIES.video.includes(ext);
  }
  /**   * Cancels all active conversion requests   * @public   */  cancelAllRequests() {    this.activeRequests.forEach((request, id) => {      if (request.controller) {        request.controller.abort();        console.log(`Cancelled request: ${id}`);      }      this.activeRequests.delete(id);    });    conversionStatus.reset();  }  /**   * Returns the count of active requests   * @public   */  getActiveRequestsCount() {    return this.activeRequests.size;  }  /**   * Cleans up resources and resets state   * @public   */  cleanup() {    this.cancelAllRequests();    this.activeRequests.clear();    conversionStatus.reset();  }  /**   * Makes a conversion request with enhanced error handling   * @private   */  static async _makeConversionRequest(endpoint, options, type) {    
    if (!endpoint) {        
      throw new ConversionError(`No endpoint defined for ${type} conversion`, 'VALIDATION_ERROR');    
    }        
    try {        
      console.log(`🔄 Making ${type} conversion request to ${endpoint}`);        
      const response = await makeRequest(endpoint, options);                
      if (!response.ok) {            
        throw new Error(`Server responded with status ${response.status}`);        
      }        
      return await response.blob();    
    } catch (error) {        
      console.error(`❌ ${type} conversion error:`, error);
      throw ErrorUtils.wrap(error);
    }
  }

  cancelRequests() {
    // Implementation depends on your HTTP client
    // If using fetch with AbortController:
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }
}

// Export singleton instance and related types
export default new ConversionClient();
export { ConversionError, ErrorUtils };

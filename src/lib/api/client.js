// src/lib/api/client.js

import { CONFIG } from '../config';
import { ConversionError, ErrorUtils } from './errors.js';
import { Converters } from './converters.js';
import { conversionStatus } from '../stores/conversionStatus.js';
import { FileStatus } from '../stores/files.js';
import { ENDPOINTS, getEndpointUrl } from './endpoints.js';  // Add this import

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

    // Normalize the item's properties
    return {
      id: item.id || crypto.randomUUID(),
      type,
      name: item.name?.trim() || 'Untitled',
      url: item.url?.trim() || null,
      content: item.content || null,
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
  async processItems(items, apiKey, options = {}) {
    try {
      const item = items[0];
      
      if (!item?.file || !(item.file instanceof File)) {
        throw new ConversionError('Valid file is required for conversion', 400);
      }

      // Validate file size
      const maxSize = CONFIG.API.MAX_FILE_SIZE;
      if (item.file.size > maxSize) {
        throw new ConversionError('File size exceeds maximum limit of 50MB', 413);
      }

      // Use ENDPOINTS for proper URL construction
      const endpoint = ENDPOINTS.CONVERT_FILE;
      const formData = new FormData();
      formData.append('file', item.file);

      const conversionOptions = {
        includeImages: true,
        includeMeta: true,
        convertLinks: true,
        ...options,
        filename: item.file.name
      };
      
      formData.append('options', JSON.stringify(conversionOptions));

      console.log('Making request to:', endpoint, {
        name: item.file.name,
        size: item.file.size,
        type: item.file.type
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
        credentials: 'include',
        mode: 'cors'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ConversionError(errorData.message || 'Conversion failed', response.status);
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/zip') || contentType?.includes('application/octet-stream')) {
        return response.blob();
      }

      return response.json();

    } catch (error) {
      console.error('Upload failed:', {
        error,
        itemName: items[0]?.file?.name,
        size: items[0]?.file?.size
      });
      throw error;
    }
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
    // Use the batch endpoint from ENDPOINTS
    const batchEndpoint = ENDPOINTS.CONVERT_BATCH;
    console.log('[CLIENT] Processing batch:', { items, endpoint: batchEndpoint });

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
        const response = await fetch(`${this.baseUrl}/batch`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new ConversionError(err.message || 'Batch conversion failed', response.status);
        }

        // Update progress and completion status
        onProgress?.(100);
        items.forEach(item => onItemComplete?.(item.id, true));

        return await response.blob();

    } catch (error) {
        console.error('[CLIENT] Batch error:', error);
        items.forEach(item => onItemComplete?.(item.id, false, error));
        throw error;
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
  /**   * Cancels all active conversion requests   * @public   */  cancelAllRequests() {    this.activeRequests.forEach((request, id) => {      if (request.controller) {        request.controller.abort();        console.log(`Cancelled request: ${id}`);      }      this.activeRequests.delete(id);    });    conversionStatus.reset();  }  /**   * Returns the count of active requests   * @public   */  getActiveRequestsCount() {    return this.activeRequests.size;  }  /**   * Cleans up resources and resets state   * @public   */  cleanup() {    this.cancelAllRequests();    this.activeRequests.clear();    conversionStatus.reset();  }  /**   * Makes a conversion request with enhanced error handling   * @private   */  static async _makeConversionRequest(endpoint, options, type) {    if (!endpoint) {        throw new ConversionError(`No endpoint defined for ${type} conversion`, 'VALIDATION_ERROR');    }        try {        console.log(`🔄 Making ${type} conversion request to ${endpoint}`);        const response = await RequestHandler.makeRequest(endpoint, options);                if (!response.ok) {            throw new Error(`Server responded with status ${response.status}`);        }        return await response.blob();    } catch (error) {        console.error(`❌ ${type} conversion error:`, error);
        throw ErrorUtils.wrap(error);
    }
  }
}

// Export singleton instance and related types
export default new ConversionClient();
export { ConversionError, ErrorUtils };

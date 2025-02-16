// src/lib/api/client.js

import { CONFIG } from '../config';
import { ConversionError, ErrorUtils } from './errors.js';
import { Converters } from './converters.js';
import { conversionStatus } from '../stores/conversionStatus.js';
import { FileStatus } from '../stores/files.js';
import { ENDPOINTS, getEndpointUrl } from './endpoints.js';
import { makeRequest } from './requestHandler.js';
import { sanitizeFilename } from '../utils/fileUtils.js';

/**
 * Manages file conversion operations and tracks their status
 */
class ConversionClient {
  constructor(baseUrl = CONFIG.API.BASE_URL) {
    this.activeRequests = new Map();
    this.config = CONFIG;
    this.baseUrl = baseUrl;
    this.isRailway = import.meta.env.PROD;
    this.supportedTypes = ['file', 'url', 'parent', 'youtube', 'audio', 'video'];
  }

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
    if (type === 'parent' && !item.url) {
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
        ...(type === 'parent' && {
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

      // Validate required properties based on type
      if (normalizedItem.type === 'url' && !normalizedItem.url) {
        throw ConversionError.validation('URL is required for URL conversion');
      }

      let result;
      switch (normalizedItem.type) {
        case 'url':
          result = await Converters.convertUrl(normalizedItem, apiKey);
          break;
        case 'youtube':
          result = await Converters.convertYoutube(normalizedItem);
          break;
        case 'parent':
          result = await Converters.convertParentUrl(normalizedItem, apiKey);
          break;
        case 'file':
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
  
          if (item.type === 'url' || item.type === 'youtube') {
            const urlData = {
              url: item.url || item.content,
              name: item.name || 'url-conversion',
              options: item.options || {},
              type: item.type
            };
            
            result = await this.makeRequest(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/markdown, application/zip, application/octet-stream',
                ...(item.type === 'youtube' ? {} : apiKey && { 'Authorization': `Bearer ${apiKey}` })
              },
              body: JSON.stringify(urlData)
            });
          } else if (item.type === 'parent') {
            result = await this.makeRequest(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/markdown, application/zip, application/octet-stream',
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
              },
              body: JSON.stringify({
                parenturl: item.url || item.content,
                options: {
                  includeImages: true,
                  includeMeta: true,
                  maxDepth: item.options?.maxDepth || 3,
                  maxPages: item.options?.maxPages || 100,
                  ...item.options
                }
              })
            });
          } else if (item.file) {
            const formData = new FormData();
            
            // Create a new file object with sanitized filename
            const originalFile = item.file;
            const sanitizedFilename = sanitizeFilename(originalFile.name);
            const sanitizedFile = new File(
              [originalFile], 
              sanitizedFilename, 
              { type: originalFile.type }
            );
            
            // Add the sanitized file and include original filename in options
            formData.append('file', sanitizedFile);
            formData.append('options', JSON.stringify({
              ...(item.options || {}),
              originalFilename: originalFile.name
            }));
  
            result = await this.makeRequest(endpoint, {
              method: 'POST',
              headers: {
                'Accept': 'text/markdown, application/zip, application/octet-stream',
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
  
      const blobResult = results.find(result => result instanceof Blob);
      if (blobResult) {
        return blobResult;
      }
      
      return results;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error instanceof ConversionError ? error : new ConversionError(error.message);
    }
  }
  
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

    const formData = new FormData();
    const urlItems = [];

    items.forEach(item => {
      if (item.file instanceof File) {
        const originalFile = item.file;
        const sanitizedFilename = sanitizeFilename(originalFile.name);
        const sanitizedFile = new File(
          [originalFile],
          sanitizedFilename,
          { type: originalFile.type }
        );
        formData.append('files', sanitizedFile);
        
        // Store original filename in the metadata
        const metadata = {
          ...item,
          originalFilename: originalFile.name
        };
        formData.append('metadata', JSON.stringify(metadata));
      } else if (item.url || item.type === 'url' || item.type === 'youtube') {
        urlItems.push({
          id: item.id,
          type: item.type,
          url: item.url || item.content,
          name: item.name,
          options: item.options
        });
      }
    });

    if (urlItems.length > 0) {
      formData.append('items', JSON.stringify(urlItems));
    }

    try {
      const result = await this.makeRequest('/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'text/markdown, application/zip, application/octet-stream'
        },
        body: formData
      });

      if (!(result instanceof Blob)) {
        throw new ConversionError(
          'Invalid response format - expected file download',
          'RESPONSE_ERROR',
          { received: typeof result }
        );
      }
      
      onProgress?.(100);
      items.forEach(item => onItemComplete?.(item.id, true));
      
      return result;

    } catch (error) {
      console.error('Batch conversion failed:', error);
      
      const wrappedError = error instanceof ConversionError ? 
        error : 
        new ConversionError(
          error.message || 'Batch conversion failed',
          error.code || 'BATCH_ERROR',
          error.details || null
        );

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

  cancelRequests() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }
}

export default new ConversionClient();
export { ConversionError, ErrorUtils };

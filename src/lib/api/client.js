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

    // File validation for audio/video/document types
    if (item.file instanceof File) {
      const fileType = item.file.name.split('.').pop().toLowerCase();
      const determinedType = this.getItemType(item);
      
      // Validate file size
      if (item.file.size > this.config.CONVERSION.FILE_SIZE_LIMIT) {
        throw ConversionError.validation(
          `File size exceeds limit of ${this.config.CONVERSION.FILE_SIZE_LIMIT / (1024 * 1024)}MB`
        );
      }

      // Validate file type
      if (!this.isSupportedFileType(fileType)) {
        throw ConversionError.validation(`Unsupported file type: ${fileType}`);
      }
    }

    // Normalize the item's properties
    return {
      id: item.id || this._generateId(),
      type,
      name: item.name?.trim() || 'Untitled',
      url: normalizedUrl,
      content: normalizedContent,
      file: item.file,  // Preserve the file object
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

  isSupportedFileType(extension) {
    if (!extension) return false;
    const categories = this.config.FILES.CATEGORIES;
    return (
      categories.documents.includes(extension) ||
      categories.audio.includes(extension) ||
      categories.video.includes(extension) ||
      categories.data.includes(extension)
    );
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
   * Makes a request to the API
   * @private
   */
  async makeRequest(endpoint, options) {
    const fullEndpoint = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
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
  
    const { useBatch = false, onProgress, onItemComplete } = options;
  
    try {
      if (useBatch) {
        return this.processBatch(items, apiKey, { onProgress, onItemComplete });
      }
  
      let progress = 0;
      const progressStep = 100 / items.length;
  
      const results = await Promise.all(items.map(async (item) => {
        try {
          const endpoint = this.getDefaultEndpoint(item);
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
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
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
          } else if (item.file instanceof File) {
            // Validate file exists and is a File object
            if (!item.file) {
              throw new ConversionError('File data is missing');
            }

            // Additional size validation
            if (item.file.size > this.config.CONVERSION.FILE_SIZE_LIMIT) {
              throw new ConversionError(
                `File size exceeds limit of ${this.config.CONVERSION.FILE_SIZE_LIMIT / (1024 * 1024)}MB`,
                'VALIDATION_ERROR'
              );
            }

            const formData = new FormData();
            formData.append('file', item.file);
            formData.append('options', JSON.stringify({
              ...item.options,
              filename: item.file.name,
              fileType: item.file.type
            }));
  
            result = await this.makeRequest(endpoint, {
              method: 'POST',
              headers: {
                'Accept': 'text/markdown, application/zip, application/octet-stream',
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
              },
              body: formData
            });

            // Log FormData content for debugging
            if (import.meta.env.DEV) {
              console.log('FormData contents:', {
                fileName: item.file.name,
                fileSize: item.file.size,
                fileType: item.file.type,
                endpoint: endpoint,
                options: item.options
              });
            }
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
    const type = this.getItemType(item);
    
    const endpointMap = {
      audio: ENDPOINTS.CONVERT_AUDIO,
      video: ENDPOINTS.CONVERT_VIDEO,
      url: ENDPOINTS.CONVERT_URL,
      parent: ENDPOINTS.CONVERT_PARENT_URL,
      youtube: ENDPOINTS.CONVERT_YOUTUBE,
      file: ENDPOINTS.CONVERT_FILE
    };
    
    return endpointMap[type] || ENDPOINTS.CONVERT_FILE;
  }

  getItemType(item) {
    if (!item) return 'file';
    
    const fileType = item.file?.name.split('.').pop().toLowerCase();
    if (item.type === 'audio' || this.isAudioType(fileType)) return 'audio';
    if (item.type === 'video' || this.isVideoType(fileType)) return 'video';
    if (item.type === 'url') return 'url';
    if (item.type === 'parent') return 'parent';
    if (item.type === 'youtube') return 'youtube';
    
    // Check if it's a supported document type
    if (this.config.FILES.CATEGORIES.documents.includes(fileType)) {
      return 'file';
    }
    
    throw new ConversionError(
      `Unsupported file type: ${fileType}`,
      'VALIDATION_ERROR'
    );
  }

  isAudioType(ext) {
    return ext && this.config.FILES.CATEGORIES.audio.includes(ext);
  }

  isVideoType(ext) {
    return ext && this.config.FILES.CATEGORIES.video.includes(ext);
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

  cancelRequests() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }
}

export default new ConversionClient();
export { ConversionError, ErrorUtils };

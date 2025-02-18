// src/lib/api/client.js

import { CONFIG, isBrowser, getOrigin } from '../config';
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
      if (!url) return null;
      
      // Use URL constructor in browser, or a basic check in SSR
      if (isBrowser()) {
        const urlObj = new URL(url);
        const normalizedPath = urlObj.pathname.replace(/\/+$/, '').toLowerCase();
        urlObj.pathname = normalizedPath;
        return urlObj.href.toLowerCase();
      } else {
        // Basic URL validation for SSR
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          throw new Error('Invalid URL format');
        }
        return url.toLowerCase();
      }
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
      if (!isBrowser()) {
        throw ConversionError.validation('File uploads are only supported in browser environment');
      }

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
      file: item.file,
      options: {
        includeImages: true,
        includeMeta: true,
        convertLinks: true,
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
    if (isBrowser()) {
      try {
        return crypto.randomUUID();
      } catch (e) {
        // Fallback
      }
    }
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Makes a request to the API
   * @private
   */
  async makeRequest(endpoint, options) {
    const fullEndpoint = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    return makeRequest(fullEndpoint, {
      ...options,
      headers: {
        ...options.headers,
        'Origin': getOrigin()
      }
    });
  }

  /**
   * Process multiple items for conversion
   * @public
   */
  async processItems(items, apiKey, options = {}) {
    if (!items?.length) {
      throw new ConversionError('No items provided for processing');
    }

    if (!isBrowser()) {
      throw new ConversionError('File processing is only supported in browser environment', 'SSR_ERROR');
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
          const preparedItem = this._validateAndNormalizeItem(item);
  
          if (preparedItem.type === 'url' || preparedItem.type === 'youtube') {
            const urlData = {
              url: preparedItem.url || preparedItem.content,
              name: preparedItem.name || 'url-conversion',
              options: preparedItem.options || {},
              type: preparedItem.type
            };
            
            return await this.makeRequest(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/markdown, application/zip, application/octet-stream',
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
              },
              body: JSON.stringify(urlData),
              onProgress: (p) => onProgress?.(Math.min(Math.round(p), 100))
            });
          }
          
          // Handle rest of the code...
          // (Rest of processItems implementation remains the same)

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
  
  // Rest of the class implementation remains the same...
}

export default new ConversionClient();
export { ConversionError, ErrorUtils };

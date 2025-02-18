// src/lib/api/requestHandler.js

import { CONFIG } from '../config';
import { ConversionError, ErrorUtils } from './errors.js';

/**
 * Types of responses the handler can process
 * @enum {string}
 */
const ResponseTypes = {
  JSON: 'json',
  BLOB: 'blob',
  TEXT: 'text',
  STREAM: 'stream'
};

/**
 * Checks if code is running in browser environment
 * @private
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Gets origin for request headers
 * @private
 */
const getOrigin = () => {
  if (isBrowser) {
    return window.location.origin;
  }
  return CONFIG.CORS.ORIGIN;
};

/**
 * Default request configuration with CORS settings
 */
const DEFAULT_CONFIG = {
  mode: 'cors',
  credentials: 'include',
  headers: {
    'Accept': 'application/json, application/zip, application/octet-stream',
    'Accept-Encoding': 'gzip, deflate, br',
    'Origin': getOrigin()
  }
};

const DEFAULT_TIMEOUT = 600000; // 10 minutes - matching backend timeout

/**
 * Handles all API requests with consistent error handling and retries
 */
export class RequestHandler {
  /**
   * Creates timeout controller for requests
   * @private
   */
  static _createTimeoutController(timeout = DEFAULT_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort('Request timeout'), timeout);
    return { controller, timeoutId };
  }

  /**
   * Gets headers with safe origin handling
   * @private
   */
  static _getHeaders(customHeaders = {}) {
    const origin = getOrigin();
    return {
      ...DEFAULT_CONFIG.headers,
      ...customHeaders,
      'Origin': origin,
      'Referer': origin
    };
  }

  /**
   * Logs request details for debugging
   * @private 
   */
  static _logRequest(endpoint, options) {
    try {
      const requestInfo = {
        endpoint,
        method: options.method,
        headers: options.headers,
      };

      // Safely log FormData contents
      if (options.body instanceof FormData) {
        const formDataEntries = {};
        for (let pair of options.body.entries()) {
          if (pair[0] === 'file') {
            formDataEntries[pair[0]] = {
              name: pair[1].name,
              type: pair[1].type,
              size: pair[1].size
            };
          } else {
            formDataEntries[pair[0]] = pair[1];
          }
        }
        requestInfo.formData = formDataEntries;
      } else if (typeof options.body === 'string') {
        try {
          requestInfo.body = JSON.parse(options.body);
        } catch {
          requestInfo.body = options.body;
        }
      }

      console.log('🚀 Request Details:', requestInfo);
    } catch (error) {
      console.error('Error logging request:', error);
    }
  }

  /**
   * Logs response details for debugging
   * @private
   */
  static _logResponse(response, data) {
    try {
      const responseInfo = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url
      };

      if (data instanceof Blob) {
        responseInfo.data = {
          type: data.type,
          size: data.size
        };
      } else {
        responseInfo.data = data;
      }

      console.log('📥 Response:', responseInfo);
    } catch (error) {
      console.error('Error logging response:', error);
    }
  }

  /**
   * Determines response type based on content headers and size
   * @private
   */
  static _getResponseType(contentType, contentLength) {
    if (!contentType) return ResponseTypes.TEXT;
    
    // Check for streaming conditions first
    if (contentLength && parseInt(contentLength) > CONFIG.API.STREAM.LARGE_FILE_THRESHOLD) {
      return ResponseTypes.STREAM;
    }
    
    if (contentType.includes('application/json')) return ResponseTypes.JSON;
    if (contentType.includes('application/zip') ||
        contentType.includes('application/octet-stream')) return ResponseTypes.BLOB;
    return ResponseTypes.TEXT;
  }

  /**
   * Handles streaming response with progress tracking
   * @private
   */
  static async _handleStreamingResponse(response, onProgress) {
    const reader = response.body.getReader();
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength) : 0;
    const chunks = [];
    let received = 0;

    console.log('🌊 Starting stream processing');

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('🏁 Stream complete');
        break;
      }

      chunks.push(value);
      received += value.length;

      if (total && onProgress) {
        const progress = (received / total) * 100;
        console.log(`📊 Stream progress: ${Math.round(progress)}%`);
        onProgress(progress);
      }
    }

    const blob = new Blob(chunks);
    console.log('📦 Stream processed:', {
      size: blob.size,
      type: blob.type || 'application/octet-stream'
    });

    return blob;
  }

  /**
   * Makes an API request with retry logic
   * @public
   */
  static async makeRequest(endpoint, options = {}) {
    const { controller, timeoutId } = this._createTimeoutController(options.timeout);
    
    try {
      const requestOptions = {
        method: options.method || 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: this._getHeaders(options.headers),
        body: options.body,
        signal: controller.signal
      };

      // Validate request body exists for POST requests
      if (requestOptions.method === 'POST' && !requestOptions.body) {
        throw new ConversionError('Request body is required for POST requests', 'VALIDATION_ERROR');
      }

      // Handle FormData specifically
      if (options.body instanceof FormData) {
        delete requestOptions.headers['Content-Type'];
        
        // Validate FormData contents for file uploads
        if (!isBrowser) {
          throw new ConversionError('File uploads are only supported in browser environment', 'VALIDATION_ERROR');
        }

        const fileEntry = Array.from(options.body.entries())
          .find(entry => entry[0] === 'file' && entry[1] instanceof File);
        
        if (!fileEntry) {
          throw new ConversionError('File data is missing from FormData', 'VALIDATION_ERROR');
        }
      } else if (!(options.body instanceof Blob)) {
        requestOptions.headers['Content-Type'] = 'application/json';
      }

      this._logRequest(endpoint, requestOptions);
      
      console.log('🚀 Making request to:', endpoint);
      const response = await fetch(endpoint, requestOptions);
      console.log('📦 Response received:', {
        status: response.status,
        contentType: response.headers.get('Content-Type'),
        url: response.url
      });
      
      return await RequestHandler._handleResponse(response, {
        onProgress: options.onProgress
      });
    } catch (error) {
      console.error('🔥 Request failed:', {
        error: error.message,
        stack: error.stack,
        endpoint
      });

      // Convert fetch errors to ConversionError
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new ConversionError(
          'Network error - please check your connection or CORS settings',
          'NETWORK_ERROR'
        );
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Handles different types of API responses
   * @private
   */
  static async _handleResponse(response, options = {}) {
    const responseForError = response.clone();
    const contentType = response.headers.get('Content-Type') || '';
    const contentLength = response.headers.get('content-length');
    const responseType = this._getResponseType(contentType, contentLength);

    if (!response.ok) {
      const errorText = await responseForError.text();
      console.error('❌ Error Response:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText,
        url: response.url
      });

      const errorData = this._parseErrorResponse(errorText, response.status);
      
      if (errorData.status === 'error' && errorData.error) {
        throw new ConversionError(
          errorData.error.message || 'Unknown server error',
          errorData.error.code || 'API_ERROR',
          errorData.error.details
        );
      }

      throw new ConversionError(
        errorData.message || `Request failed with status ${response.status}`,
        'API_ERROR',
        errorData
      );
    }

    let data;
    console.log('🔍 Processing response of type:', responseType);
    
    const isDownloadable = response.headers.get('Content-Disposition')?.includes('attachment') ||
                          response.headers.get('Content-Type')?.includes('application/zip') ||
                          responseType === ResponseTypes.BLOB;

    try {
      if (responseType === ResponseTypes.STREAM || 
          response.headers.get('transfer-encoding') === 'chunked') {
        console.log('🌊 Processing streaming response');
        data = await this._handleStreamingResponse(response, options.onProgress);
      } else if (isDownloadable) {
        console.log('📦 Processing as downloadable content');
        data = await response.blob();
        console.log('📦 Blob created:', {
          size: data.size,
          type: data.type
        });
      } else {
        switch (responseType) {
          case ResponseTypes.JSON:
            console.log('📋 Processing JSON response...');
            data = await response.json();
            if (!data.success) {
              throw ConversionError.fromResponse(data);
            }
            break;
          default:
            console.log('📝 Processing text response...');
            data = await response.text();
        }
      }

      this._logResponse(response, data);
      return data;
    } catch (error) {
      console.error('Error processing response:', error);
      throw new ConversionError(
        'Failed to process server response',
        'RESPONSE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Parses error responses
   * @private
   */
  static _parseErrorResponse(errorText, status) {
    try {
      return JSON.parse(errorText);
    } catch {
      return {
        message: errorText || `HTTP error ${status}`,
        status
      };
    }
  }
}

// Export utility functions
export const makeRequest = RequestHandler.makeRequest.bind(RequestHandler);

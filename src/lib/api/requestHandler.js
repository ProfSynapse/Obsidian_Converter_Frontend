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
  TEXT: 'text'
};

/**
 * Default request configuration
 */
const DEFAULT_CONFIG = {
  credentials: 'include',
  mode: 'cors',
  headers: {
    'Accept': 'application/json, application/zip, application/octet-stream',
    'Content-Type': 'application/json'
  },
  keepalive: true
};

const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Handles all API requests with consistent error handling and retries
 */
export class RequestHandler {
  /**
   * Creates timeout controller for requests
   * @private
   */
  static _createTimeoutController(timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort('Request timeout'), timeout);
    return { controller, timeoutId };
  }

  /**
   * Logs request details for debugging
   * @private 
   */
  static _logRequest(endpoint, options, body) {
    const requestInfo = {
      endpoint,
      method: options.method,
      headers: options.headers,
      body: typeof body === 'string' ? JSON.parse(body) : body
    };
    console.log('🚀 Request Details:', requestInfo);
  }

  /**
   * Logs response details for debugging
   * @private
   */
  static _logResponse(response, data) {
    console.log('📥 Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data
    });
  }

  /**
   * Determines response type based on content headers
   * @private
   */
  static _getResponseType(contentType) {
    if (contentType.includes('application/json')) return ResponseTypes.JSON;
    if (contentType.includes('application/zip') ||
      contentType.includes('application/octet-stream')) return ResponseTypes.BLOB;
    return ResponseTypes.TEXT;
  }

  /**
   * Makes an API request with retry logic
   * @public
   */
  static async makeRequest(endpoint, options) {
    try {
      if (options.body instanceof FormData) {
        // Clone headers to avoid mutation
        const headers = { ...options.headers };
        delete headers['Content-Type']; // Remove Content-Type for FormData

        const requestOptions = {
          method: options.method || 'POST',
          credentials: 'include',
          mode: 'cors',
          headers,
          body: options.body,
          signal: options.signal,
          keepalive: true
        };

        // Log request details
        this._logRequest(endpoint, requestOptions);

        const response = await fetch(endpoint, requestOptions);
        return await RequestHandler._handleResponse(response);
      }

      // Handle non-FormData requests
      console.log('🚀 Making non-FormData request to:', endpoint);
      const response = await fetch(endpoint, {
        ...DEFAULT_CONFIG,
        ...options,
        headers: {
          ...DEFAULT_CONFIG.headers,
          ...options.headers
        }
      });
      console.log('📦 Response received:', {
        status: response.status,
        contentType: response.headers.get('Content-Type')
      });
      return await RequestHandler._handleResponse(response);
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  /**
   * Handles different types of API responses
   * @private
   */
  static async _handleResponse(response) {
    const contentType = response.headers.get('Content-Type') || '';
    const responseType = this._getResponseType(contentType);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error Response:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText
      });

      const errorData = this._parseErrorResponse(errorText, response.status);
      
      // Enhanced error logging with structured data
      console.error('🚨 API Error:', {
        status: response.status,
        statusText: response.statusText,
        data: errorData,
        endpoint: response.url
      });

      // Handle structured API errors
      if (errorData.status === 'error' && errorData.error) {
        throw new ConversionError(
          errorData.error.message || 'Unknown server error',
          errorData.error.code || 'API_ERROR',
          errorData.error.details
        );
      }

      // Fallback for unstructured errors
      throw new ConversionError(
        errorData.message || `Request failed with status ${response.status}`,
        'API_ERROR',
        errorData
      );
    }

    let data;
    console.log('🔍 Processing response of type:', responseType);
    
    switch (responseType) {
      case ResponseTypes.BLOB:
        console.log('📦 Converting response to blob...');
        data = await response.blob();
        console.log('📦 Blob created:', {
          size: data.size,
          type: data.type
        });
        break;
      case ResponseTypes.JSON:
        console.log('📋 Processing JSON response...');
        data = await response.json();
        if (!data.success && !response.headers.get('Content-Type')?.includes('application/zip')) {
          throw ConversionError.fromResponse(data);
        }
        break;
      default:
        console.log('📝 Processing text response...');
        data = await response.text();
    }

    // Special handling for zip files that might be marked as JSON
    if (data instanceof Blob || 
        response.headers.get('Content-Disposition')?.includes('attachment') ||
        response.headers.get('Content-Type')?.includes('application/zip')) {
      console.log('🎁 Detected downloadable content, ensuring blob format');
      if (!(data instanceof Blob)) {
        data = await response.blob();
      }
    }

    this._logResponse(response, data);
    return data;
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

  /**
   * Handles request errors and implements retry logic
   * @private
   */
  static async _handleError(error) {
    console.error('🔥 Request failed:', error);
    throw error;
  }

  /**
   * Determines if request should be retried
   * @private
   */
  static _shouldRetry(error) {
    // Don't retry validation or 400 errors
    if ((error instanceof ConversionError && error.code === 'VALIDATION_ERROR') ||
      error.status === 400 || (error.response?.status === 400)) {
      return false;
    }

    // Retry network and timeout errors
    return error instanceof ConversionError ?
      ErrorUtils.isRetryable(error) :
      ['NetworkError', 'AbortError', 'TimeoutError'].includes(error.name);
  }

  /**
   * Creates an error object from response
   * @private
   */
  static async _createErrorFromResponse(response) {
    try {
      const errorData = await response.json();
      return new Error(errorData.message || `Request failed with status ${response.status}`);
    } catch {
      return new Error(`Request failed with status ${response.status}`);
    }
  }
}

// Export utility functions
export const makeRequest = RequestHandler.makeRequest.bind(RequestHandler);

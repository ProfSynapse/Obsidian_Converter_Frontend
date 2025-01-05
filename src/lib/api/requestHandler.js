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
      // Remove Content-Type header if body is FormData
      if (options.body instanceof FormData) {
        const { 'Content-Type': removed, ...headers } = options.headers || {};
        options.headers = headers;
      }

      const response = await fetch(endpoint, {
        ...DEFAULT_CONFIG,
        ...options,
        headers: {
          ...DEFAULT_CONFIG.headers,
          ...options.headers
        }
      });

      // Log response details
      console.log('API Response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type')
      });

      return response;

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
      throw ConversionError.fromResponse(errorData);
    }

    let data;
    switch (responseType) {
      case ResponseTypes.BLOB:
        data = await response.blob();
        break;
      case ResponseTypes.JSON:
        data = await response.json();
        if (!data.success) {
          throw ConversionError.fromResponse(data);
        }
        break;
      default:
        data = await response.text();
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

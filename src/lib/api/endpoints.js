// src/lib/api/endpoints.js

import { CONFIG } from '../config';

/**
 * Generates endpoint URLs based on base URL
 * @param {string} baseUrl - The base URL for the API
 * @returns {Object} Object containing all endpoint URLs
 */
function generateEndpoints(baseUrl) {
    const endpoints = {
        CONVERT_FILE: `/api/v1/document/file`,  // Add /api/v1 prefix
        CONVERT_URL: `/api/v1/web/url`,
        CONVERT_PARENT_URL: `/api/v1/web/parent-url`,
        CONVERT_YOUTUBE: `/api/v1/web/youtube`,
        CONVERT_BATCH: `/api/v1/batch`,
        CONVERT_AUDIO: `/api/v1/multimedia/audio`,
        CONVERT_VIDEO: `/api/v1/multimedia/video`
    };

    // Return full URLs when baseUrl is provided
    if (baseUrl) {
        return Object.fromEntries(
            Object.entries(endpoints).map(([key, path]) => [
                key,
                new URL(path, baseUrl).toString()
            ])
        );
    }

    return Object.freeze(endpoints);
}

const API_BASE_URL = CONFIG.API.BASE_URL;

export const ENDPOINTS = generateEndpoints(API_BASE_URL);

// Validate endpoints in development
if (import.meta.env.DEV) {
    validateEndpoints(ENDPOINTS);
    console.log('API Base URL:', CONFIG.API.BASE_URL);
    console.log('API Endpoints:', ENDPOINTS);
}

/**
 * Validates endpoint configuration
 * @param {Object} endpoints - The endpoints object to validate
 * @throws {Error} If any endpoint is invalid
 */
function validateEndpoints(endpoints) {
    Object.entries(endpoints).forEach(([key, url]) => {
        try {
            new URL(url);
        } catch (error) {
            console.error(`Invalid endpoint URL for ${key}: ${url}`);
            throw new Error(`Invalid endpoint URL for ${key}: ${url}`);
        }
    });
}

/**
 * Gets the URL for a specific endpoint type and ID
 * @param {string} type - The type of endpoint (e.g., 'url', 'file')
 * @param {string} [id] - Optional ID for specific resource
 * @returns {string} The complete endpoint URL
 */
export function getEndpointUrl(type, id = null) {
    const endpointMap = {
        url: ENDPOINTS.CONVERT_URL,
        file: ENDPOINTS.CONVERT_FILE,
        parent: ENDPOINTS.CONVERT_PARENT_URL,
        youtube: ENDPOINTS.CONVERT_YOUTUBE,
        batch: ENDPOINTS.CONVERT_BATCH,
        audio: ENDPOINTS.CONVERT_AUDIO,
        video: ENDPOINTS.CONVERT_VIDEO
    };
    
    const endpoint = endpointMap[type.toLowerCase()] || ENDPOINTS.CONVERT_FILE;
    return id ? `${endpoint}/${id}` : endpoint;
}

/**
 * Checks if an endpoint exists
 * @param {string} type - The type of endpoint to check
 * @returns {boolean} Whether the endpoint exists
 */
export function hasEndpoint(type) {
    return !!ENDPOINTS[`CONVERT_${type.toUpperCase()}`];
}

// Export utility functions and types
export const EndpointUtils = {
    generateEndpoints,
    validateEndpoints,
    getEndpointUrl,
    hasEndpoint
};
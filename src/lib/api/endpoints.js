// src/lib/api/endpoints.js

import { CONFIG } from '../config';

/**
 * Generates endpoint URLs based on base URL
 * @param {string} baseUrl - The base URL for the API
 * @returns {Object} Object containing all endpoint URLs
 */
function generateEndpoints(baseUrl) {
    // Define all endpoints with proper paths
    const endpoints = {
        CONVERT_FILE: '/document/file',
        CONVERT_URL: '/web/url',
        CONVERT_PARENT_URL: '/web/parent-url',
        CONVERT_YOUTUBE: '/web/youtube',
        CONVERT_BATCH: '/batch',
        CONVERT_AUDIO: '/multimedia/audio',
        CONVERT_VIDEO: '/multimedia/video'
    };

    // Ensure proper URL construction
    if (baseUrl) {
        // Remove trailing slashes and normalize
        const normalizedBase = baseUrl.replace(/\/+$/, '');
        const apiBase = normalizedBase.includes('/api/v1') ? 
            normalizedBase : 
            `${normalizedBase}/api/v1`;

        return Object.fromEntries(
            Object.entries(endpoints).map(([key, path]) => [
                key,
                `${apiBase}${path}`
            ])
        );
    }

    return endpoints;
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
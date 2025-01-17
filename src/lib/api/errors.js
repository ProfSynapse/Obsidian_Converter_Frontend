// src/lib/api/errors.js

/**
 * Custom error class for conversion-related errors
 */
export class ConversionError extends Error {
    constructor(message, code = 'CONVERSION_ERROR', details = null) {
        super(message);
        this.name = 'ConversionError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }

    /**
     * Creates a validation error instance
     */
    static validation(message, details = null) {
        return new ConversionError(message, 'VALIDATION_ERROR', details);
    }

    /**
     * Creates an error instance from API response
     */
    static fromResponse(response) {
        // Handle structured error responses
        if (response.error) {
            return new ConversionError(
                response.error.message || 'Unknown error',
                response.error.code || 'API_ERROR',
                response.error.details
            );
        }
        
        // Handle plain error messages
        return new ConversionError(
            response.message || 'Unknown error',
            response.code || 'API_ERROR',
            response.details || null
        );
    }
}

/**
 * Error utility functions
 */
export const ErrorUtils = {
    wrap(error) {
        if (error instanceof ConversionError) return error;
        
        // Check for validation errors from API
        if (error.status === 400 || error?.response?.status === 400) {
            return ConversionError.validation(
                error.message || 'Validation failed',
                error.details
            );
        }
        
        return new ConversionError(
            error.message,
            'UNKNOWN_ERROR',
            error
        );
    },

    isRetryable(error) {
        // Add status code check
        if (error.status === 400 || error?.response?.status === 400) {
            return false;
        }

        const retryableCodes = ['NETWORK_ERROR', 'API_ERROR', 'TIMEOUT_ERROR'];
        return retryableCodes.includes(error?.code);
    }
};

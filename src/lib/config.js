// Environment variables with fallbacks
const ENV = {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 
        import.meta.env.PROD ? 
        'https://backend-production-6e08.up.railway.app/api/v1' : 
        'http://localhost:3000/api/v1',
    MAX_PAYLOAD_SIZE: 500 * 1024 * 1024, // 500MB - matching backend
    CORS_ORIGIN: import.meta.env.VITE_ORIGIN || 'https://frontend-production-2748.up.railway.app',
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'https://backend-production-6e08.up.railway.app'
};

// Export URLs for other modules
export const API_BASE_URL = ENV.API_BASE_URL;
export const BACKEND_URL = ENV.BACKEND_URL;
export const FRONTEND_URL = ENV.CORS_ORIGIN;

export const CONFIG = {
    API: {
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        TIMEOUT: 600000, // 10 minutes - matching backend
        BASE_URL: ENV.API_BASE_URL,
        HEADERS: {
            'Accept': 'application/json, application/zip, application/octet-stream',
            'Accept-Encoding': 'gzip, deflate, br',
            'Origin': ENV.CORS_ORIGIN
        },
        ENDPOINTS: {
            FILE: '/document/file',
            URL: '/web/url',
            PARENT_URL: '/web/parent-url',
            BATCH: '/batch',
            AUDIO: '/multimedia/audio',
            VIDEO: '/multimedia/video'
        },
        MAX_FILE_SIZE: ENV.MAX_PAYLOAD_SIZE,
        STREAM: {
            CHUNK_SIZE: 1024 * 1024, // 1MB chunks
            LARGE_FILE_THRESHOLD: 50 * 1024 * 1024, // 50MB
            BATCH_SIZE: 50 * 1024 * 1024 // 50MB chunks for batching
        }
    },

    CORS: {
        ORIGIN: ENV.CORS_ORIGIN,
        CREDENTIALS: true,
        METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        ALLOWED_HEADERS: [
            'Content-Type', 
            'Authorization', 
            'Accept', 
            'Accept-Encoding', 
            'Content-Disposition',
            'Origin',
            'Referer'
        ]
    },

    FILES: {
        CATEGORIES: {
            documents: ['pdf', 'docx', 'pptx'],
            audio: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'wma'],
            video: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
            data: ['csv', 'xlsx']
        },
        TYPES: {
            // Document types
            FILE: 'file',
            DOCUMENT: 'document',
            
            // Web types
            URL: 'url',
            PARENT_URL: 'parenturl',
            
            // Multimedia types
            AUDIO: 'audio',
            VIDEO: 'video',
            
            // Batch processing
            BATCH: 'batch'
        },
        API_REQUIRED: [
            'mp3', 'wav', 'm4a',
            'mp4', 'webm', 'avi'
        ],
        ICONS: {
            document: 'file-text',
            image: 'image',
            video: 'video',
            audio: 'music',
            pdf: 'file-text',
            text: 'file-text',
            html: 'code',
            docx: 'file-text'
        }
    },

    PROGRESS: {
        START: 0,
        VALIDATING: 5,
        PREPARING: 10,
        CONVERTING: 20,
        PROCESSING: 40,
        STREAMING: 60,     // New streaming state
        DOWNLOADING: 80,   // New downloading state
        FINALIZING: 90,
        COMPLETE: 100
    },

    CONVERSION: {
        SUPPORTED_TYPES: ['file', 'url', 'parent', 'batch'],
        DEFAULT_OPTIONS: {
            includeImages: true,
            includeMeta: true,
            convertLinks: true
        },
        BATCH_SIZE_LIMIT: 30,
        FILE_SIZE_LIMIT: ENV.MAX_PAYLOAD_SIZE,
        COMPRESSION: {
            LEVEL: 6,           // Matching backend compression level
            PLATFORM_SPECIFIC: true, // Enable platform-specific settings
            USE_BATCHING: true  // Enable processing in batches
        }
    },

    UI: {
        STATUSES: {
            READY: 'ready',
            CONVERTING: 'converting',
            STREAMING: 'streaming',    // New streaming status
            DOWNLOADING: 'downloading', // New downloading status
            COMPLETED: 'completed',
            ERROR: 'error'
        },
        COLORS: {
            PRIMARY: '#00a99d',
            SECONDARY: '#93278f',
            TERTIARY: '#fbf7f1',
            TEXT: '#333333',
            BACKGROUND: '#ffffff',
            ERROR: '#ff3860'
        },
        CSS: {
            ROUNDED_CORNERS: '12px',
            TRANSITION_SPEED: '0.3s',
            BOX_SHADOW: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }
    },

    STATUS: {
        SUCCESS: 'success',
        ERROR: 'error',
        PENDING: 'pending',
        PROCESSING: 'processing',
        STREAMING: 'streaming',    // New streaming status
        DOWNLOADING: 'downloading', // New downloading status
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    },

    ERROR_TYPES: {
        VALIDATION: 'VALIDATION_ERROR',
        NETWORK: 'NETWORK_ERROR',
        CONVERSION: 'CONVERSION_ERROR',
        TIMEOUT: 'TIMEOUT_ERROR',
        STREAM: 'STREAM_ERROR',    // New streaming error type
        UNKNOWN: 'UNKNOWN_ERROR'
    },

    STORAGE: {
        API_KEY: 'obsdian_note_converter_api_key'
    }
};

// Add environment checks
if (import.meta.env.DEV) {
    console.log('Environment Configuration:', {
        env: import.meta.env.MODE,
        baseUrl: CONFIG.API.BASE_URL,
        corsOrigin: CONFIG.CORS.ORIGIN,
        backendUrl: ENV.BACKEND_URL,
        maxFileSize: CONFIG.API.MAX_FILE_SIZE,
        streamConfig: CONFIG.API.STREAM
    });
}

// Error messages
export const ERRORS = {
    UNSUPPORTED_FILE_TYPE: 'Unsupported file type',
    API_KEY_REQUIRED: 'API key is required',
    INVALID_API_KEY: 'Invalid API key format',
    INVALID_URL: 'Invalid URL format',
    NO_FILES_FOR_CONVERSION: 'At least one file is required for conversion',
    STREAM_ERROR: 'Error during file streaming',
    DOWNLOAD_ERROR: 'Error during file download',
    CORS_ERROR: 'Cross-Origin Request Blocked - Please check CORS configuration'
};

// Export commonly used configurations
export const { ITEM_TYPES, FILE_CATEGORIES, API_REQUIRED_TYPES } = CONFIG.FILES;
export const { STATUSES, COLORS, CSS } = CONFIG.UI;

// Helper functions
export const requiresApiKey = (file) => {
    if (!file) return false;
    const ext = (typeof file === 'string' ? file : file.name)
        .split('.')
        .pop()
        .toLowerCase();
    return CONFIG.FILES.API_REQUIRED.includes(ext);
};

// Helper to determine if streaming should be used
export const shouldUseStreaming = (fileSize) => {
    return fileSize > CONFIG.API.STREAM.LARGE_FILE_THRESHOLD;
};

// Freeze configurations to prevent modifications
Object.freeze(CONFIG);
Object.freeze(ERRORS);

export default CONFIG;

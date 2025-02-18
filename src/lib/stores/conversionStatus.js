// src/lib/stores/conversionStatus.js

import { writable, derived } from 'svelte/store';
import { files } from './files.js';
import { CONFIG } from '../config.js';

// Initial state with enhanced progress tracking
const initialState = {
  status: 'ready',      // 'ready' | 'converting' | 'streaming' | 'downloading' | 'completed' | 'error' | 'cancelled'
  stage: 'idle',        // Detailed processing stage from CONFIG.PROGRESS
  progress: 0,          // Overall progress percentage
  currentFile: null,    // ID of the current file being converted
  error: null,          // Error message, if any
  completedCount: 0,    // Number of successfully converted files
  errorCount: 0,        // Number of files that failed to convert
  streamInfo: {         // New streaming information
    isStreaming: false,
    bytesReceived: 0,
    totalBytes: 0,
    speed: 0            // Bytes per second
  }
};

/**
 * Creates a conversionStatus store with enhanced streaming capabilities
 * @returns {Object} The conversionStatus store instance
 */
function createConversionStore() {
  const { subscribe, set, update } = writable(initialState);
  let completionCallbacks = [];
  let progressTimer = null;

  // Track streaming speed
  let lastUpdate = Date.now();
  let lastBytes = 0;

  const calculateSpeed = (currentBytes) => {
    const now = Date.now();
    const timeDiff = (now - lastUpdate) / 1000; // Convert to seconds
    const bytesDiff = currentBytes - lastBytes;
    const speed = bytesDiff / timeDiff;

    lastUpdate = now;
    lastBytes = currentBytes;

    return speed;
  };

  return {
    subscribe,
    
    setStatus: (status) =>
      update((state) => ({ ...state, status })),
    
    setStage: (stage) =>
      update((state) => ({ ...state, stage })),
    
    setProgress: (progress) =>
      update((state) => ({ ...state, progress })),
    
    setCurrentFile: (currentFile) =>
      update((state) => ({ ...state, currentFile })),
    
    setError: (error) =>
      update((state) => ({ 
        ...state, 
        error, 
        status: error ? 'error' : state.status,
        stage: error ? 'error' : state.stage
      })),

    /**
     * Updates streaming progress
     * @param {number} bytesReceived - Current bytes received
     * @param {number} totalBytes - Total bytes expected
     */
    updateStreamProgress: (bytesReceived, totalBytes) => {
      update(state => {
        const speed = calculateSpeed(bytesReceived);
        const progress = totalBytes ? (bytesReceived / totalBytes) * 100 : 0;
        
        return {
          ...state,
          progress: Math.min(progress, 100),
          streamInfo: {
            isStreaming: true,
            bytesReceived,
            totalBytes,
            speed
          }
        };
      });
    },

    /**
     * Starts the streaming process
     * @param {number} totalBytes - Total bytes expected
     */
    startStreaming: (totalBytes) => {
      update(state => ({
        ...state,
        status: 'streaming',
        stage: 'streaming',
        progress: 0,
        streamInfo: {
          isStreaming: true,
          bytesReceived: 0,
          totalBytes,
          speed: 0
        }
      }));
    },

    /**
     * Starts the download process
     */
    startDownload: () => {
      update(state => ({
        ...state,
        status: 'downloading',
        stage: 'downloading'
      }));
    },

    reset: () => {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      lastUpdate = Date.now();
      lastBytes = 0;
      set(initialState);
    },

    startConversion: () => {
      set({ 
        ...initialState, 
        status: 'converting',
        stage: 'preparing'
      });
    },

    completeConversion: () => {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      
      set({ 
        ...initialState, 
        status: 'completed',
        stage: 'complete',
        progress: 100 
      });
      
      // Trigger completion callbacks
      completionCallbacks.forEach(callback => callback());
    },

    /**
     * Adds a completion callback
     * @param {Function} callback - The callback function to execute upon completion
     */
    onComplete: (callback) => {
      completionCallbacks.push(callback);
    },

    /**
     * Updates progress stage and percentage
     * @param {string} stage - The current stage from CONFIG.PROGRESS
     * @param {number} progress - Optional override for progress percentage
     */
    updateStage: (stage, progress = null) => {
      update(state => ({
        ...state,
        stage,
        progress: progress ?? CONFIG.PROGRESS[stage] ?? state.progress
      }));
    },

    /**
     * Increments the completedCount
     */
    incrementCompleted: () => {
      update(state => ({ ...state, completedCount: state.completedCount + 1 }));
    },

    /**
     * Increments the errorCount
     */
    incrementError: () => {
      update(state => ({ ...state, errorCount: state.errorCount + 1 }));
    },

    /**
     * Resets the conversion counts
     */
    resetCounts: () => {
      update(state => ({ ...state, completedCount: 0, errorCount: 0 }));
    },

    /**
     * Cancels the current conversion
     */
    cancel: () => {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      update(state => ({
        ...state,
        status: 'cancelled',
        stage: 'cancelled',
        streamInfo: initialState.streamInfo
      }));
    }
  };
}

export const conversionStatus = createConversionStore();

// Derived stores for easy access to specific properties
export const conversionProgress = derived(conversionStatus, $status => $status.progress);
export const currentFile = derived(conversionStatus, $status => $status.currentFile);
export const conversionError = derived(conversionStatus, $status => $status.error);
export const completedCount = derived(conversionStatus, $status => $status.completedCount);
export const errorCount = derived(conversionStatus, $status => $status.errorCount);
export const streamingStatus = derived(conversionStatus, $status => $status.streamInfo);
export const currentStage = derived(conversionStatus, $status => $status.stage);

// Derived store to check if all files are processed
export const isConversionComplete = derived(
  [conversionStatus, files],
  ([$conversionStatus, $files]) => {
    return $files.length > 0 && 
           ($files.filter(f => f.status === 'completed').length + 
            $files.filter(f => f.status === 'error').length) === $files.length;
  }
);

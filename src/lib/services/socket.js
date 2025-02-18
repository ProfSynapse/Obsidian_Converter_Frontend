import { io } from 'socket.io-client';
import { CONFIG, SOCKET_EVENTS } from '../config';
import { get } from 'svelte/store';
import { conversionStatus } from '../stores/conversionStatus';
import { files } from '../stores/files';

class SocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.jobSubscriptions = new Map();
    }

    /**
     * Initialize socket connection
     */
    connect() {
        if (this.socket) return;

        console.log('🔌 Connecting to socket server:', CONFIG.SOCKET.URL);
        this.socket = io(CONFIG.SOCKET.URL, CONFIG.SOCKET.OPTIONS);

        // Set up connection event handlers
        this.socket.on(SOCKET_EVENTS.CONNECT, () => {
            console.log('🟢 Socket connected');
            this.connected = true;
        });

        this.socket.on(SOCKET_EVENTS.DISCONNECT, () => {
            console.log('🔴 Socket disconnected');
            this.connected = false;
        });

        this.socket.on(SOCKET_EVENTS.RECONNECT, (attemptNumber) => {
            console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
            this.connected = true;
            this._resubscribeToJobs();
        });

        // Set up error handling
        this.socket.on('error', (error) => {
            console.error('🔥 Socket error:', error);
        });

        this.socket.on('connect_error', (error) => {
            console.error('🔥 Socket connection error:', error);
        });
    }

    /**
     * Subscribe to job updates
     * @param {string} jobId - The ID of the job to subscribe to
     * @param {Object} callbacks - Callback functions for different events
     */
    subscribeToJob(jobId, callbacks = {}) {
        if (!this.socket) {
            console.error('Socket not initialized');
            return;
        }

        console.log(`📥 Subscribing to job updates for ${jobId}`);
        
        // Store callbacks for potential resubscription
        this.jobSubscriptions.set(jobId, callbacks);

        // Subscribe to job events
        this.socket.emit('subscribe:job', { jobId });

        // Set up event handlers
        this.socket.on(`${SOCKET_EVENTS.JOB_STATUS}:${jobId}`, (data) => {
            console.log(`📊 Job status update for ${jobId}:`, data);
            callbacks.onStatus?.(data);
            
            // Update conversion status store
            conversionStatus.update(status => ({
                ...status,
                [jobId]: {
                    ...status[jobId],
                    status: data.status,
                    message: data.message
                }
            }));
        });

        this.socket.on(`${SOCKET_EVENTS.JOB_PROGRESS}:${jobId}`, (data) => {
            console.log(`📈 Job progress for ${jobId}:`, data);
            callbacks.onProgress?.(data);
            
            // Update conversion status store
            conversionStatus.update(status => ({
                ...status,
                [jobId]: {
                    ...status[jobId],
                    progress: data.progress
                }
            }));
        });

        this.socket.on(`${SOCKET_EVENTS.JOB_COMPLETE}:${jobId}`, (data) => {
            console.log(`✅ Job complete for ${jobId}:`, data);
            callbacks.onComplete?.(data);
            
            // Update file status
            files.update(fileList => {
                return fileList.map(file => {
                    if (file.jobId === jobId) {
                        return {
                            ...file,
                            status: 'completed',
                            downloadUrl: data.downloadUrl
                        };
                    }
                    return file;
                });
            });

            // Cleanup subscription
            this._cleanupJobSubscription(jobId);
        });

        this.socket.on(`${SOCKET_EVENTS.JOB_ERROR}:${jobId}`, (error) => {
            console.error(`❌ Job error for ${jobId}:`, error);
            callbacks.onError?.(error);
            
            // Update file status
            files.update(fileList => {
                return fileList.map(file => {
                    if (file.jobId === jobId) {
                        return {
                            ...file,
                            status: 'error',
                            error: error.message
                        };
                    }
                    return file;
                });
            });

            // Cleanup subscription
            this._cleanupJobSubscription(jobId);
        });
    }

    /**
     * Unsubscribe from job updates
     * @param {string} jobId - The ID of the job to unsubscribe from
     */
    unsubscribeFromJob(jobId) {
        if (!this.socket) return;

        console.log(`📤 Unsubscribing from job updates for ${jobId}`);
        this.socket.emit('unsubscribe:job', { jobId });
        this._cleanupJobSubscription(jobId);
    }

    /**
     * Clean up job subscription
     * @private
     */
    _cleanupJobSubscription(jobId) {
        if (!this.socket) return;

        // Remove all event listeners for this job
        this.socket.off(`${SOCKET_EVENTS.JOB_STATUS}:${jobId}`);
        this.socket.off(`${SOCKET_EVENTS.JOB_PROGRESS}:${jobId}`);
        this.socket.off(`${SOCKET_EVENTS.JOB_COMPLETE}:${jobId}`);
        this.socket.off(`${SOCKET_EVENTS.JOB_ERROR}:${jobId}`);

        // Remove from subscriptions map
        this.jobSubscriptions.delete(jobId);
    }

    /**
     * Resubscribe to all active jobs
     * @private
     */
    _resubscribeToJobs() {
        for (const [jobId, callbacks] of this.jobSubscriptions.entries()) {
            this.subscribeToJob(jobId, callbacks);
        }
    }

    /**
     * Disconnect socket
     */
    disconnect() {
        if (!this.socket) return;

        console.log('🔌 Disconnecting socket');
        this.socket.disconnect();
        this.socket = null;
        this.connected = false;
        this.jobSubscriptions.clear();
    }
}

// Export singleton instance
export default new SocketService();

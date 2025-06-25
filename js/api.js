// QR Check-in Staff PWA - API Management

/**
 * API communication with the QR Check-in System backend
 */
class ApiManager {
    constructor() {
        // Configuration - should be set from environment or config
        this.baseURL = 'http://office.fanpokka.ai:8000';
        this.timeout = 30000; // 30 seconds
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        
        // Request interceptors
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        // Auth token
        this.authToken = null;
        
        this.setupInterceptors();
    }

    /**
     * Set up default request/response interceptors
     */
    setupInterceptors() {
        // Add auth token to requests
        this.addRequestInterceptor((config) => {
            if (this.authToken) {
                config.headers = config.headers || {};
                config.headers['Authorization'] = `Bearer ${this.authToken}`;
            }
            return config;
        });

        // Handle auth errors
        this.addResponseInterceptor(
            (response) => response,
            (error) => {
                if (error.status === 401) {
                    this.handleAuthError();
                }
                throw error;
            }
        );
    }

    /**
     * Add request interceptor
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    /**
     * Add response interceptor
     */
    addResponseInterceptor(fulfilled, rejected) {
        this.responseInterceptors.push({ fulfilled, rejected });
    }

    /**
     * Set authentication token
     */
    setAuthToken(token) {
        this.authToken = token;
        Storage.setLocalData('authToken', token);
    }

    /**
     * Clear authentication token
     */
    clearAuthToken() {
        this.authToken = null;
        Storage.removeLocalData('authToken');
    }

    /**
     * Load auth token from storage
     */
    loadAuthToken() {
        this.authToken = Storage.getLocalData('authToken');
        return this.authToken;
    }

    /**
     * Handle authentication errors
     */
    handleAuthError() {
        this.clearAuthToken();
        window.dispatchEvent(new CustomEvent('auth:logout', {
            detail: { reason: 'token_expired' }
        }));
    }

    /**
     * Make HTTP request with interceptors and error handling
     */
    async request(config) {
        // Apply request interceptors
        let processedConfig = { ...config };
        for (const interceptor of this.requestInterceptors) {
            processedConfig = interceptor(processedConfig);
        }

        // Set defaults
        const url = `${this.baseURL}${processedConfig.url}`;
        const options = {
            method: processedConfig.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...processedConfig.headers
            },
            signal: AbortSignal.timeout(this.timeout),
            ...processedConfig.options
        };

        // Add body for non-GET requests
        if (processedConfig.data && options.method !== 'GET') {
            if (processedConfig.data instanceof FormData) {
                delete options.headers['Content-Type']; // Let browser set it for FormData
                options.body = processedConfig.data;
            } else {
                options.body = JSON.stringify(processedConfig.data);
            }
        }

        try {
            const response = await fetch(url, options);
            
            let result = {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                data: null
            };

            // Parse response body
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                result.data = await response.json();
            } else {
                result.data = await response.text();
            }

            // Handle HTTP errors
            if (!response.ok) {
                const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
                error.status = response.status;
                error.response = result;
                throw error;
            }

            // Apply response interceptors
            for (const interceptor of this.responseInterceptors) {
                try {
                    result = interceptor.fulfilled ? interceptor.fulfilled(result) : result;
                } catch (interceptorError) {
                    if (interceptor.rejected) {
                        result = interceptor.rejected(interceptorError);
                    } else {
                        throw interceptorError;
                    }
                }
            }

            return result;

        } catch (error) {
            // Apply error response interceptors
            for (const interceptor of this.responseInterceptors) {
                if (interceptor.rejected) {
                    try {
                        return interceptor.rejected(error);
                    } catch (interceptorError) {
                        error = interceptorError;
                    }
                }
            }
            throw error;
        }
    }

    /**
     * Retry failed requests with exponential backoff
     */
    async requestWithRetry(config) {
        let lastError;
        let delay = this.retryDelay;

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                return await this.request(config);
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx) except 401, 408, 429
                if (error.status >= 400 && error.status < 500 && 
                    ![401, 408, 429].includes(error.status)) {
                    throw error;
                }

                if (attempt < this.retryAttempts) {
                    console.warn(`Request failed (attempt ${attempt}/${this.retryAttempts}), retrying in ${delay}ms...`);
                    await Utils.sleep(delay);
                    delay *= 2; // Exponential backoff
                }
            }
        }

        throw lastError;
    }

    // Convenience methods
    async get(url, config = {}) {
        return this.request({ ...config, url, method: 'GET' });
    }

    async post(url, data, config = {}) {
        return this.request({ ...config, url, method: 'POST', data });
    }

    async put(url, data, config = {}) {
        return this.request({ ...config, url, method: 'PUT', data });
    }

    async delete(url, config = {}) {
        return this.request({ ...config, url, method: 'DELETE' });
    }

    // API Endpoints

    /**
     * Staff login
     */
    async login(credentials) {
        const response = await this.post('/api/v1/staff/login', credentials);
        if (response.data && response.data.access_token) {
            this.setAuthToken(response.data.access_token);
        }
        return response.data;
    }

    /**
     * Get staff profile
     */
    async getProfile() {
        const response = await this.get('/api/v1/staff/me/profile');
        return response.data;
    }

    /**
     * Get staff events
     */
    async getStaffEvents() {
        const response = await this.get('/api/v1/staff/me/events');
        return response.data;
    }

    /**
     * Get tickets for an event (if available via API)
     * Note: This might not be available in the current API, 
     * may need to be implemented on the backend
     */
    async getEventTickets(eventId) {
        try {
            const response = await this.get(`/api/v1/mgmt/tickets?event_id=${eventId}&limit=10000`);
            return response.data;
        } catch (error) {
            console.warn('Event tickets endpoint not available, using alternative approach');
            // Alternative: We might need to implement this differently
            // For now, return empty array
            return [];
        }
    }

    /**
     * Get public ticket info
     */
    async getPublicTicket(uuid) {
        const response = await this.get(`/api/v1/public/tickets/${uuid}`);
        return response.data;
    }

    /**
     * Get QR token for ticket
     */
    async getQRToken(uuid) {
        const response = await this.get(`/api/v1/public/tickets/${uuid}/qr-token`);
        return response.data;
    }

    /**
     * Check in a ticket
     */
    async checkinTicket(qrToken, eventId) {
        const response = await this.post('/api/v1/staff/checkin/', {
            qr_token: qrToken,
            event_id: eventId
        });
        return response.data;
    }

    /**
     * Sync offline check-ins
     */
    async syncOfflineCheckins(eventId, checkins) {
        const response = await this.post('/api/v1/staff/checkin/sync', {
            event_id: eventId,
            checkins: checkins
        });
        return response.data;
    }

    /**
     * Get check-in logs for an event
     */
    async getCheckinLogs(eventId, skip = 0, limit = 100) {
        const response = await this.get(`/api/v1/staff/checkin/logs/${eventId}?skip=${skip}&limit=${limit}`);
        return response.data;
    }

    /**
     * Health check
     */
    async healthCheck() {
        const response = await this.get('/health');
        return response.data;
    }

    /**
     * Check network connectivity
     */
    async checkConnectivity() {
        try {
            await this.healthCheck();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Batch request helper
     */
    async batch(requests) {
        const promises = requests.map(request => 
            this.requestWithRetry(request).catch(error => ({ error }))
        );
        return Promise.all(promises);
    }

    /**
     * Upload offline data
     */
    async uploadOfflineData(data) {
        const results = [];
        
        // Upload check-ins
        if (data.checkins && data.checkins.length > 0) {
            try {
                const result = await this.syncOfflineCheckins(
                    data.eventId, 
                    data.checkins
                );
                results.push({ type: 'checkins', success: true, result });
            } catch (error) {
                results.push({ type: 'checkins', success: false, error });
            }
        }

        return results;
    }

    /**
     * Download event data for offline use
     */
    async downloadEventData(eventId) {
        try {
            const [eventDetails, tickets] = await Promise.all([
                this.getStaffEvents().then(events => 
                    events.find(e => e.event_id === eventId)
                ),
                this.getEventTickets(eventId)
            ]);

            return {
                event: eventDetails,
                tickets: tickets || [],
                downloadedAt: new Date()
            };
        } catch (error) {
            console.error('Failed to download event data:', error);
            throw error;
        }
    }
}

// Create singleton instance
const API = new ApiManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
} else {
    window.API = API;
}

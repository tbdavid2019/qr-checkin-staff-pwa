// QR Check-in Staff PWA - Sync Management

/**
 * Sync management for offline/online data synchronization
 */
class SyncManager {
    constructor() {
        this.syncInterval = 10 * 60 * 1000; // 10 minutes
        this.syncTimer = null;
        this.isSyncing = false;
        this.lastSyncTime = null;
        this.syncQueue = [];
        
        this.initializeSync();
    }

    /**
     * Initialize sync manager
     */
    async initializeSync() {
        // Load last sync time
        this.lastSyncTime = Storage.getLocalData('lastSyncTime');
        
        // Setup network status listeners
        this.setupNetworkListeners();
        
        // Start auto sync if online
        if (Utils.isOnline()) {
            this.startAutoSync();
        }
        
        // Load pending sync queue
        await this.loadSyncQueue();
    }

    /**
     * Setup network status listeners
     */
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            console.log('Network: Online - starting sync');
            this.handleNetworkOnline();
        });

        window.addEventListener('offline', () => {
            console.log('Network: Offline - stopping auto sync');
            this.handleNetworkOffline();
        });

        // Listen for visibility changes to sync when app comes back
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && Utils.isOnline() && Auth.isAuthenticated()) {
                this.syncNow();
            }
        });
    }

    /**
     * Handle network coming online
     */
    async handleNetworkOnline() {
        this.dispatchSyncEvent('networkOnline');
        
        if (Auth.isAuthenticated()) {
            this.startAutoSync();
            await this.syncNow();
        }
    }

    /**
     * Handle network going offline
     */
    handleNetworkOffline() {
        this.stopAutoSync();
        this.dispatchSyncEvent('networkOffline');
    }

    /**
     * Start automatic sync
     */
    startAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        this.syncTimer = setInterval(() => {
            if (Utils.isOnline() && Auth.isAuthenticated()) {
                this.syncNow();
            }
        }, this.syncInterval);

        console.log('Sync: Auto sync started');
    }

    /**
     * Stop automatic sync
     */
    stopAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
        console.log('Sync: Auto sync stopped');
    }

    /**
     * Perform sync now
     */
    async syncNow() {
        if (this.isSyncing) {
            console.log('Sync: Already in progress, skipping');
            return false;
        }

        if (!Utils.isOnline()) {
            console.log('Sync: Offline, cannot sync');
            return false;
        }

        if (!Auth.isAuthenticated()) {
            console.log('Sync: Not authenticated, cannot sync');
            return false;
        }

        this.isSyncing = true;
        this.dispatchSyncEvent('syncStart');

        try {
            console.log('Sync: Starting synchronization...');
            
            const results = await this.performSync();
            
            this.lastSyncTime = new Date().toISOString();
            Storage.setLocalData('lastSyncTime', this.lastSyncTime);
            
            this.dispatchSyncEvent('syncSuccess', { results });
            
            console.log('Sync: Completed successfully', results);
            return true;

        } catch (error) {
            console.error('Sync: Failed', error);
            this.dispatchSyncEvent('syncError', { error });
            return false;
        } finally {
            this.isSyncing = false;
            this.dispatchSyncEvent('syncEnd');
        }
    }

    /**
     * Perform the actual sync operations
     */
    async performSync() {
        const results = {
            checkins: { uploaded: 0, failed: 0 },
            events: { downloaded: 0, failed: 0 },
            tickets: { updated: 0, failed: 0 }
        };

        // 1. Upload offline check-ins
        await this.uploadOfflineCheckins(results);

        // 2. Download latest events data
        await this.downloadEventsData(results);

        // 3. Update ticket statuses
        await this.updateTicketStatuses(results);

        // 4. Process sync queue
        await this.processSyncQueue(results);

        return results;
    }

    /**
     * Upload offline check-ins
     */
    async uploadOfflineCheckins(results) {
        try {
            const pendingCheckins = await Storage.getPendingCheckins();
            
            if (pendingCheckins.length === 0) {
                return;
            }

            console.log(`Sync: Uploading ${pendingCheckins.length} offline check-ins`);

            // Group by event
            const checkinsByEvent = {};
            pendingCheckins.forEach(checkin => {
                if (!checkinsByEvent[checkin.event_id]) {
                    checkinsByEvent[checkin.event_id] = [];
                }
                checkinsByEvent[checkin.event_id].push({
                    ticket_id: checkin.ticket_id,
                    event_id: checkin.event_id,
                    checkin_time: checkin.checkin_time,
                    client_timestamp: checkin.created_at
                });
            });

            // Upload each event's check-ins
            for (const [eventId, checkins] of Object.entries(checkinsByEvent)) {
                try {
                    const response = await API.syncOfflineCheckins(parseInt(eventId), checkins);
                    
                    // Mark as synced
                    for (const checkin of pendingCheckins.filter(c => c.event_id == eventId)) {
                        await Storage.markCheckinSynced(checkin.id);
                    }
                    
                    results.checkins.uploaded += checkins.length;
                    console.log(`Sync: Uploaded ${checkins.length} check-ins for event ${eventId}`);
                    
                } catch (error) {
                    console.error(`Sync: Failed to upload check-ins for event ${eventId}:`, error);
                    results.checkins.failed += checkins.length;
                }
            }

        } catch (error) {
            console.error('Sync: Failed to upload offline check-ins:', error);
            throw error;
        }
    }

    /**
     * Download latest events data
     */
    async downloadEventsData(results) {
        try {
            const events = await API.getStaffEvents();
            await Storage.saveEvents(events);
            
            results.events.downloaded = events.length;
            console.log(`Sync: Downloaded ${events.length} events`);
            
        } catch (error) {
            console.error('Sync: Failed to download events:', error);
            results.events.failed = 1;
        }
    }

    /**
     * Update ticket statuses
     */
    async updateTicketStatuses(results) {
        try {
            const selectedEvent = Storage.getLocalData('selectedEvent');
            if (!selectedEvent) {
                return;
            }

            // Get current tickets
            const tickets = await Storage.getTicketsByEvent(selectedEvent.event_id);
            
            // Update a sample of tickets to check for status changes
            // Note: This might need a specific API endpoint
            let updated = 0;
            
            results.tickets.updated = updated;
            
        } catch (error) {
            console.error('Sync: Failed to update ticket statuses:', error);
            results.tickets.failed = 1;
        }
    }

    /**
     * Process sync queue
     */
    async processSyncQueue(results) {
        try {
            const queue = await Storage.getSyncQueue();
            
            for (const item of queue) {
                try {
                    await this.processSyncQueueItem(item);
                    await Storage.removeSyncQueueItem(item.id);
                } catch (error) {
                    console.error('Sync: Failed to process queue item:', error);
                    await Storage.updateSyncQueueItem(item.id, {
                        attempts: (item.attempts || 0) + 1,
                        last_error: error.message
                    });
                }
            }
            
        } catch (error) {
            console.error('Sync: Failed to process sync queue:', error);
        }
    }

    /**
     * Process a single sync queue item
     */
    async processSyncQueueItem(item) {
        switch (item.type) {
            case 'checkin':
                return await API.checkinTicket(item.data.qr_token, item.data.event_id);
            default:
                console.warn('Sync: Unknown queue item type:', item.type);
        }
    }

    /**
     * Load sync queue from storage
     */
    async loadSyncQueue() {
        try {
            this.syncQueue = await Storage.getSyncQueue();
        } catch (error) {
            console.error('Sync: Failed to load sync queue:', error);
            this.syncQueue = [];
        }
    }

    /**
     * Add item to sync queue
     */
    async addToSyncQueue(type, data) {
        try {
            const item = {
                type,
                data,
                created_at: new Date().toISOString()
            };
            
            await Storage.addToSyncQueue(item);
            this.syncQueue.push(item);
            
            // Try to sync immediately if online
            if (Utils.isOnline() && Auth.isAuthenticated()) {
                this.syncNow();
            }
            
        } catch (error) {
            console.error('Sync: Failed to add to sync queue:', error);
        }
    }

    /**
     * Get sync status
     */
    getSyncStatus() {
        return {
            isSyncing: this.isSyncing,
            lastSyncTime: this.lastSyncTime,
            queueLength: this.syncQueue.length,
            isOnline: Utils.isOnline(),
            autoSyncEnabled: !!this.syncTimer
        };
    }

    /**
     * Force full sync
     */
    async forceSyncAll() {
        console.log('Sync: Force sync all data');
        return await this.syncNow();
    }

    /**
     * Download event data for offline use
     */
    async downloadEventData(eventId) {
        try {
            this.dispatchSyncEvent('downloadStart', { eventId });
            
            console.log(`Sync: Downloading data for event ${eventId}`);
            
            const eventData = await API.downloadEventData(eventId);
            
            // Save to storage
            if (eventData.event) {
                await Storage.saveEvents([eventData.event]);
            }
            
            if (eventData.tickets && eventData.tickets.length > 0) {
                await Storage.saveTickets(eventData.tickets);
            }
            
            // Save download info
            Storage.setLocalData('selectedEvent', {
                ...eventData.event,
                downloadedAt: eventData.downloadedAt,
                ticketCount: eventData.tickets.length
            });
            
            this.dispatchSyncEvent('downloadSuccess', { 
                eventId, 
                ticketCount: eventData.tickets.length 
            });
            
            console.log(`Sync: Downloaded ${eventData.tickets.length} tickets for event ${eventId}`);
            
            return eventData;
            
        } catch (error) {
            console.error('Sync: Failed to download event data:', error);
            this.dispatchSyncEvent('downloadError', { eventId, error });
            throw error;
        }
    }

    /**
     * Clear all offline data
     */
    async clearOfflineData() {
        try {
            await Storage.clearAllData();
            Storage.removeLocalData('selectedEvent');
            Storage.removeLocalData('lastSyncTime');
            
            this.lastSyncTime = null;
            this.syncQueue = [];
            
            this.dispatchSyncEvent('dataCleared');
            
        } catch (error) {
            console.error('Sync: Failed to clear offline data:', error);
            throw error;
        }
    }

    /**
     * Get pending sync count
     */
    async getPendingSyncCount() {
        try {
            const [pendingCheckins, syncQueue] = await Promise.all([
                Storage.getPendingCheckins(),
                Storage.getSyncQueue()
            ]);
            
            return pendingCheckins.length + syncQueue.length;
            
        } catch (error) {
            console.error('Sync: Failed to get pending sync count:', error);
            return 0;
        }
    }

    /**
     * Register for background sync (if supported)
     */
    async registerBackgroundSync() {
        try {
            if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('checkin-sync');
                console.log('Sync: Background sync registered');
            }
        } catch (error) {
            console.warn('Sync: Background sync not supported or failed:', error);
        }
    }

    /**
     * Setup periodic sync (if supported)
     */
    async setupPeriodicSync() {
        try {
            if ('serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype) {
                const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
                if (status.state === 'granted') {
                    const registration = await navigator.serviceWorker.ready;
                    await registration.periodicSync.register('checkin-periodic-sync', {
                        minInterval: 12 * 60 * 60 * 1000 // 12 hours
                    });
                    console.log('Sync: Periodic sync registered');
                }
            }
        } catch (error) {
            console.warn('Sync: Periodic sync not supported or failed:', error);
        }
    }

    /**
     * Dispatch sync events
     */
    dispatchSyncEvent(type, detail = {}) {
        window.dispatchEvent(new CustomEvent(`sync:${type}`, { detail }));
    }

    /**
     * Cleanup sync manager
     */
    cleanup() {
        this.stopAutoSync();
        
        window.removeEventListener('online', this.handleNetworkOnline);
        window.removeEventListener('offline', this.handleNetworkOffline);
    }
}

// Create singleton instance
const Sync = new SyncManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sync;
} else {
    window.Sync = Sync;
}

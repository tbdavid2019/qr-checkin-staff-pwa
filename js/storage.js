// QR Check-in Staff PWA - Storage Management

/**
 * Storage management for offline capabilities
 * Uses IndexedDB for large data and localStorage for settings
 */
class StorageManager {
    constructor() {
        this.dbName = 'QRStaffDB';
        this.dbVersion = 1;
        this.db = null;
        this.stores = {
            events: 'events',
            tickets: 'tickets',
            checkins: 'checkins',
            syncQueue: 'syncQueue',
            staff: 'staff'
        };
    }

    /**
     * Initialize the database
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Events store
                if (!db.objectStoreNames.contains(this.stores.events)) {
                    const eventsStore = db.createObjectStore(this.stores.events, { keyPath: 'id' });
                    eventsStore.createIndex('merchant_id', 'merchant_id', { unique: false });
                }

                // Tickets store
                if (!db.objectStoreNames.contains(this.stores.tickets)) {
                    const ticketsStore = db.createObjectStore(this.stores.tickets, { keyPath: 'id' });
                    ticketsStore.createIndex('event_id', 'event_id', { unique: false });
                    ticketsStore.createIndex('uuid', 'uuid', { unique: true });
                    ticketsStore.createIndex('is_used', 'is_used', { unique: false });
                }

                // Check-ins store
                if (!db.objectStoreNames.contains(this.stores.checkins)) {
                    const checkinsStore = db.createObjectStore(this.stores.checkins, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    checkinsStore.createIndex('ticket_id', 'ticket_id', { unique: false });
                    checkinsStore.createIndex('event_id', 'event_id', { unique: false });
                    checkinsStore.createIndex('checkin_time', 'checkin_time', { unique: false });
                    checkinsStore.createIndex('synced', 'synced', { unique: false });
                }

                // Sync queue store
                if (!db.objectStoreNames.contains(this.stores.syncQueue)) {
                    const syncStore = db.createObjectStore(this.stores.syncQueue, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    syncStore.createIndex('created_at', 'created_at', { unique: false });
                    syncStore.createIndex('status', 'status', { unique: false });
                }

                // Staff store
                if (!db.objectStoreNames.contains(this.stores.staff)) {
                    db.createObjectStore(this.stores.staff, { keyPath: 'id' });
                }

                console.log('IndexedDB schema created/updated');
            };
        });
    }

    /**
     * Get a transaction for the specified stores
     */
    getTransaction(storeNames, mode = 'readonly') {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        return this.db.transaction(storeNames, mode);
    }

    /**
     * Get an object store
     */
    getStore(storeName, mode = 'readonly') {
        const transaction = this.getTransaction([storeName], mode);
        return transaction.objectStore(storeName);
    }

    // Events Management
    async saveEvents(events) {
        const store = this.getStore(this.stores.events, 'readwrite');
        const promises = events.map(event => store.put(event));
        return Promise.all(promises);
    }

    async getEvents() {
        const store = this.getStore(this.stores.events);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getEvent(eventId) {
        const store = this.getStore(this.stores.events);
        return new Promise((resolve, reject) => {
            const request = store.get(eventId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Tickets Management
    async saveTickets(tickets) {
        const store = this.getStore(this.stores.tickets, 'readwrite');
        const promises = tickets.map(ticket => store.put(ticket));
        return Promise.all(promises);
    }

    async getTicketsByEvent(eventId) {
        const store = this.getStore(this.stores.tickets);
        const index = store.index('event_id');
        return new Promise((resolve, reject) => {
            const request = index.getAll(eventId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getTicketByUUID(uuid) {
        const store = this.getStore(this.stores.tickets);
        const index = store.index('uuid');
        return new Promise((resolve, reject) => {
            const request = index.get(uuid);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateTicket(ticket) {
        const store = this.getStore(this.stores.tickets, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put(ticket);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clearTickets() {
        const store = this.getStore(this.stores.tickets, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Check-ins Management
    async saveCheckin(checkin) {
        const store = this.getStore(this.stores.checkins, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.add({
                ...checkin,
                synced: false,
                created_at: new Date()
            });
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getCheckinsByEvent(eventId) {
        const store = this.getStore(this.stores.checkins);
        const index = store.index('event_id');
        return new Promise((resolve, reject) => {
            const request = index.getAll(eventId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getPendingCheckins() {
        const store = this.getStore(this.stores.checkins);
        const index = store.index('synced');
        return new Promise((resolve, reject) => {
            const request = index.getAll(false);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async markCheckinSynced(checkinId) {
        const store = this.getStore(this.stores.checkins, 'readwrite');
        return new Promise((resolve, reject) => {
            const getRequest = store.get(checkinId);
            getRequest.onsuccess = () => {
                const checkin = getRequest.result;
                if (checkin) {
                    checkin.synced = true;
                    checkin.synced_at = new Date();
                    const putRequest = store.put(checkin);
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    reject(new Error('Check-in not found'));
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    // Sync Queue Management
    async addToSyncQueue(operation) {
        const store = this.getStore(this.stores.syncQueue, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.add({
                ...operation,
                status: 'pending',
                created_at: new Date(),
                attempts: 0
            });
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getSyncQueue() {
        const store = this.getStore(this.stores.syncQueue);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateSyncQueueItem(id, updates) {
        const store = this.getStore(this.stores.syncQueue, 'readwrite');
        return new Promise((resolve, reject) => {
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const item = getRequest.result;
                if (item) {
                    Object.assign(item, updates);
                    const putRequest = store.put(item);
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    reject(new Error('Sync queue item not found'));
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async removeSyncQueueItem(id) {
        const store = this.getStore(this.stores.syncQueue, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Staff Management
    async saveStaffInfo(staff) {
        const store = this.getStore(this.stores.staff, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put(staff);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getStaffInfo(staffId) {
        const store = this.getStore(this.stores.staff);
        return new Promise((resolve, reject) => {
            const request = store.get(staffId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Statistics
    async getStats(eventId = null) {
        const [tickets, checkins] = await Promise.all([
            eventId ? this.getTicketsByEvent(eventId) : this.getAllTickets(),
            eventId ? this.getCheckinsByEvent(eventId) : this.getAllCheckins()
        ]);

        const totalTickets = tickets.length;
        const checkedInTickets = new Set(checkins.map(c => c.ticket_id)).size;
        const pendingSync = (await this.getPendingCheckins()).length;

        return {
            totalTickets,
            checkedInTickets,
            pendingTickets: totalTickets - checkedInTickets,
            pendingSync
        };
    }

    async getAllTickets() {
        const store = this.getStore(this.stores.tickets);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllCheckins() {
        const store = this.getStore(this.stores.checkins);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Clear all data
    async clearAllData() {
        const storeNames = Object.values(this.stores);
        const transaction = this.getTransaction(storeNames, 'readwrite');
        
        const promises = storeNames.map(storeName => {
            return new Promise((resolve, reject) => {
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        });

        return Promise.all(promises);
    }

    // LocalStorage helpers
    setLocalData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }

    getLocalData(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Failed to read from localStorage:', error);
            return defaultValue;
        }
    }

    removeLocalData(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Failed to remove from localStorage:', error);
        }
    }

    // Get storage usage
    async getStorageUsage() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                return {
                    usage: estimate.usage,
                    quota: estimate.quota,
                    usageDetails: estimate.usageDetails
                };
            }
        } catch (error) {
            console.warn('Storage API not available:', error);
        }
        return null;
    }
}

// Create singleton instance
const Storage = new StorageManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
} else {
    window.Storage = Storage;
}

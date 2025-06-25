// QR Check-in Staff PWA - Service Worker

const CACHE_NAME = 'qr-staff-v1.0.0';
const STATIC_CACHE = 'qr-staff-static-v1.0.0';
const DYNAMIC_CACHE = 'qr-staff-dynamic-v1.0.0';

// Files to cache on install
const STATIC_FILES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/main.css',
    '/css/login.css',
    '/css/scanner.css',
    '/css/stats.css',
    '/js/app.js',
    '/js/auth.js',
    '/js/api.js',
    '/js/storage.js',
    '/js/scanner.js',
    '/js/sync.js',
    '/js/utils.js',
    '/libs/qr-scanner.min.js',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// API endpoints to cache (for offline data)
const API_CACHE_PATTERNS = [
    /^.*\/api\/v1\/staff\/me\/profile$/,
    /^.*\/api\/v1\/staff\/me\/events$/,
    /^.*\/api\/v1\/public\/tickets\/.*$/,
    /^.*\/health$/
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Service Worker: Caching static files...');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Service Worker: Static files cached');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Failed to cache static files:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE &&
                            cacheName.startsWith('qr-staff-')) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated');
                return self.clients.claim();
            })
            .catch(error => {
                console.error('Service Worker: Activation failed:', error);
            })
    );
});

// Fetch event - serve cached files or fetch from network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Handle different types of requests
    if (isStaticFile(request)) {
        event.respondWith(handleStaticFile(request));
    } else if (isAPIRequest(request)) {
        event.respondWith(handleAPIRequest(request));
    } else {
        event.respondWith(handleOtherRequest(request));
    }
});

// Check if request is for a static file
function isStaticFile(request) {
    const url = new URL(request.url);
    return STATIC_FILES.some(file => url.pathname === file) ||
           url.pathname.startsWith('/css/') ||
           url.pathname.startsWith('/js/') ||
           url.pathname.startsWith('/icons/') ||
           url.pathname.startsWith('/libs/');
}

// Check if request is for an API endpoint
function isAPIRequest(request) {
    const url = new URL(request.url);
    return url.pathname.startsWith('/api/') || url.pathname === '/health';
}

// Handle static file requests (cache first)
async function handleStaticFile(request) {
    try {
        const cache = await caches.open(STATIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.warn('Service Worker: Failed to serve static file:', error);
        
        // Return offline fallback if available
        const cache = await caches.open(STATIC_CACHE);
        const fallback = await cache.match('/index.html');
        return fallback || new Response('Offline', { status: 503 });
    }
}

// Handle API requests (network first, with cache fallback)
async function handleAPIRequest(request) {
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful GET responses for specific endpoints
            if (shouldCacheAPIResponse(request)) {
                const cache = await caches.open(DYNAMIC_CACHE);
                cache.put(request, networkResponse.clone());
            }
        }
        
        return networkResponse;
    } catch (error) {
        console.warn('Service Worker: Network failed for API request:', error);
        
        // Try cache fallback for cacheable endpoints
        if (shouldCacheAPIResponse(request)) {
            const cache = await caches.open(DYNAMIC_CACHE);
            const cachedResponse = await cache.match(request);
            
            if (cachedResponse) {
                console.log('Service Worker: Serving cached API response');
                return cachedResponse;
            }
        }
        
        // Return offline response
        return new Response(
            JSON.stringify({ 
                error: 'Offline', 
                message: 'Network unavailable' 
            }), 
            { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Handle other requests (network first)
async function handleOtherRequest(request) {
    try {
        return await fetch(request);
    } catch (error) {
        console.warn('Service Worker: Network failed for other request:', error);
        
        // Return offline page
        const cache = await caches.open(STATIC_CACHE);
        const offlinePage = await cache.match('/index.html');
        return offlinePage || new Response('Offline', { status: 503 });
    }
}

// Check if API response should be cached
function shouldCacheAPIResponse(request) {
    const url = new URL(request.url);
    return API_CACHE_PATTERNS.some(pattern => pattern.test(request.url));
}

// Background sync for offline operations
self.addEventListener('sync', event => {
    console.log('Service Worker: Background sync triggered:', event.tag);
    
    if (event.tag === 'checkin-sync') {
        event.waitUntil(syncOfflineCheckins());
    }
});

// Sync offline check-ins when network is available
async function syncOfflineCheckins() {
    try {
        // This would typically communicate with the main app
        // For now, we'll just log and let the app handle the actual sync
        console.log('Service Worker: Syncing offline check-ins...');
        
        // Notify all clients about sync opportunity
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_OPPORTUNITY',
                tag: 'checkin-sync'
            });
        });
        
        return Promise.resolve();
    } catch (error) {
        console.error('Service Worker: Background sync failed:', error);
        throw error;
    }
}

// Push notifications (for future use)
self.addEventListener('push', event => {
    console.log('Service Worker: Push message received');
    
    let options = {
        body: 'QR Staff 通知',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: 'qr-staff-notification',
        requireInteraction: false,
        actions: [
            {
                action: 'open',
                title: '開啟應用程式'
            },
            {
                action: 'dismiss',
                title: '關閉'
            }
        ]
    };
    
    if (event.data) {
        const data = event.data.json();
        options = { ...options, ...data };
    }
    
    event.waitUntil(
        self.registration.showNotification('QR Check-in Staff', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            self.clients.matchAll().then(clients => {
                // Check if app is already open
                const client = clients.find(c => 
                    c.url === self.registration.scope && 'focus' in c
                );
                
                if (client) {
                    return client.focus();
                } else {
                    return self.clients.openWindow('/');
                }
            })
        );
    }
});

// Message handler for communication with main app
self.addEventListener('message', event => {
    console.log('Service Worker: Message received:', event.data);
    
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CACHE_CLEAR':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            }).catch(error => {
                event.ports[0].postMessage({ success: false, error });
            });
            break;
            
        case 'FORCE_SYNC':
            if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
                self.registration.sync.register('checkin-sync');
            }
            break;
    }
});

// Clear all caches
async function clearAllCaches() {
    try {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('Service Worker: All caches cleared');
    } catch (error) {
        console.error('Service Worker: Failed to clear caches:', error);
        throw error;
    }
}

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
    self.addEventListener('periodicsync', event => {
        if (event.tag === 'checkin-periodic-sync') {
            event.waitUntil(syncOfflineCheckins());
        }
    });
}

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', event => {
    console.error('Service Worker: Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// Log service worker lifecycle
console.log('Service Worker: Script loaded');

// Cache versioning helper
function updateCacheVersion() {
    const version = Date.now();
    return `qr-staff-v${version}`;
}

// Network status helper
function isOnline() {
    return navigator.onLine;
}

// Cleanup old data periodically
setInterval(() => {
    // Clean up old dynamic cache entries
    caches.open(DYNAMIC_CACHE).then(cache => {
        cache.keys().then(requests => {
            requests.forEach(request => {
                cache.match(request).then(response => {
                    if (response) {
                        const cachedDate = new Date(response.headers.get('date'));
                        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                        
                        if (cachedDate < oneDayAgo) {
                            cache.delete(request);
                        }
                    }
                });
            });
        });
    });
}, 60 * 60 * 1000); // Run every hour

// QR Check-in Staff PWA - Utility Functions

/**
 * Utility functions for common operations
 */
const Utils = {
    /**
     * Generate a unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Format date to local string
     */
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        return new Date(date).toLocaleString('zh-TW', { ...defaultOptions, ...options });
    },

    /**
     * Format date to time only
     */
    formatTime(date) {
        return new Date(date).toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Format date to date only
     */
    formatDateOnly(date) {
        return new Date(date).toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    },

    /**
     * Debounce function calls
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function calls
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers or non-secure contexts
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const result = document.execCommand('copy');
                textArea.remove();
                return result;
            }
        } catch (error) {
            console.error('Failed to copy text:', error);
            return false;
        }
    },

    /**
     * Sleep/delay function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Validate UUID format
     */
    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    },

    /**
     * Sanitize HTML to prevent XSS
     */
    sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },

    /**
     * Parse JSON safely
     */
    parseJSON(str, defaultValue = null) {
        try {
            return JSON.parse(str);
        } catch (error) {
            console.warn('Failed to parse JSON:', error);
            return defaultValue;
        }
    },

    /**
     * Stringify JSON safely
     */
    stringifyJSON(obj, defaultValue = '{}') {
        try {
            return JSON.stringify(obj);
        } catch (error) {
            console.warn('Failed to stringify JSON:', error);
            return defaultValue;
        }
    },

    /**
     * Get battery information
     */
    async getBatteryInfo() {
        try {
            if ('getBattery' in navigator) {
                const battery = await navigator.getBattery();
                return {
                    level: Math.round(battery.level * 100),
                    charging: battery.charging
                };
            }
        } catch (error) {
            console.warn('Battery API not available:', error);
        }
        return null;
    },

    /**
     * Get network information
     */
    getNetworkInfo() {
        try {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (connection) {
                return {
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt,
                    saveData: connection.saveData
                };
            }
        } catch (error) {
            console.warn('Network Information API not available:', error);
        }
        return null;
    },

    /**
     * Check if device is online
     */
    isOnline() {
        return navigator.onLine;
    },

    /**
     * Get device info
     */
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            screen: {
                width: screen.width,
                height: screen.height,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
                pixelDepth: screen.pixelDepth
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
    },

    /**
     * Vibrate device (if supported)
     */
    vibrate(pattern = [200]) {
        try {
            if ('vibrate' in navigator) {
                navigator.vibrate(pattern);
                return true;
            }
        } catch (error) {
            console.warn('Vibration API not available:', error);
        }
        return false;
    },

    /**
     * Request notification permission
     */
    async requestNotificationPermission() {
        try {
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                return permission === 'granted';
            }
        } catch (error) {
            console.warn('Notification API not available:', error);
        }
        return false;
    },

    /**
     * Show notification
     */
    showNotification(title, options = {}) {
        try {
            if ('Notification' in window && Notification.permission === 'granted') {
                const defaultOptions = {
                    icon: '/icons/icon-192x192.png',
                    badge: '/icons/icon-96x96.png',
                    tag: 'qr-staff-notification',
                    renotify: true,
                    requireInteraction: false,
                    silent: false
                };
                
                return new Notification(title, { ...defaultOptions, ...options });
            }
        } catch (error) {
            console.warn('Failed to show notification:', error);
        }
        return null;
    },

    /**
     * Calculate file size in human readable format
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Calculate time ago
     */
    timeAgo(date) {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now - past;
        const diffMins = Math.round(diffMs / 60000);
        const diffHours = Math.round(diffMs / 3600000);
        const diffDays = Math.round(diffMs / 86400000);

        if (diffMins < 1) return '剛剛';
        if (diffMins < 60) return `${diffMins} 分鐘前`;
        if (diffHours < 24) return `${diffHours} 小時前`;
        if (diffDays < 7) return `${diffDays} 天前`;
        
        return this.formatDateOnly(date);
    },

    /**
     * Retry function with exponential backoff
     */
    async retry(fn, options = {}) {
        const {
            maxAttempts = 3,
            baseDelay = 1000,
            maxDelay = 10000,
            backoffFactor = 2
        } = options;

        let attempt = 1;
        let delay = baseDelay;

        while (attempt <= maxAttempts) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxAttempts) {
                    throw error;
                }

                console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error);
                await this.sleep(delay);
                
                delay = Math.min(delay * backoffFactor, maxDelay);
                attempt++;
            }
        }
    },

    /**
     * Create element with attributes and children
     */
    createElement(tag, attributes = {}, ...children) {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key.startsWith('on')) {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });
        
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });
        
        return element;
    },

    /**
     * Check if element is in viewport
     */
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    /**
     * Smooth scroll to element
     */
    scrollToElement(element, options = {}) {
        const defaultOptions = {
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
        };
        
        element.scrollIntoView({ ...defaultOptions, ...options });
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
} else {
    window.Utils = Utils;
}

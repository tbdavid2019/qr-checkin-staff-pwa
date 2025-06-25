// QR Check-in Staff PWA - Authentication Management

/**
 * Authentication management for staff login and session handling
 */
class AuthManager {
    constructor() {
        this.currentStaff = null;
        this.authToken = null;
        this.loginAttempts = 0;
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
        
        this.initializeAuth();
    }

    /**
     * Initialize authentication state
     */
    async initializeAuth() {
        try {
            // Load saved auth token
            this.authToken = Storage.getLocalData('authToken');
            if (this.authToken) {
                API.setAuthToken(this.authToken);
                await this.validateSession();
            }
        } catch (error) {
            console.warn('Failed to initialize auth:', error);
            this.clearSession();
        }
    }

    /**
     * Validate current session
     */
    async validateSession() {
        try {
            const profile = await API.getProfile();
            this.currentStaff = profile;
            
            // Save staff info
            Storage.setLocalData('currentStaff', profile);
            
            this.dispatchAuthEvent('login', { staff: profile });
            return true;
        } catch (error) {
            console.warn('Session validation failed:', error);
            this.clearSession();
            return false;
        }
    }

    /**
     * Staff login
     */
    async login(credentials) {
        try {
            // Check lockout
            if (this.isLockedOut()) {
                const lockoutInfo = this.getLockoutInfo();
                throw new Error(`登入已鎖定，請於 ${Utils.formatTime(lockoutInfo.unlockTime)} 後重試`);
            }

            // Prepare credentials
            const loginData = {};
            
            if (credentials.username && credentials.password) {
                loginData.username = credentials.username;
                loginData.password = credentials.password;
            } else if (credentials.loginCode) {
                loginData.login_code = credentials.loginCode;
            } else {
                throw new Error('請提供用戶名密碼或登入碼');
            }

            // Attempt login
            const response = await API.login(loginData);
            
            if (response && response.access_token) {
                this.authToken = response.access_token;
                this.currentStaff = {
                    id: response.staff_id,
                    full_name: response.full_name
                };

                // Clear login attempts on success
                this.clearLoginAttempts();

                // Save auth data
                Storage.setLocalData('authToken', this.authToken);
                Storage.setLocalData('currentStaff', this.currentStaff);
                Storage.setLocalData('lastLogin', new Date().toISOString());

                // Get full profile
                await this.loadStaffProfile();

                this.dispatchAuthEvent('login', { staff: this.currentStaff });
                
                return {
                    success: true,
                    staff: this.currentStaff
                };
            } else {
                throw new Error('登入回應格式錯誤');
            }

        } catch (error) {
            this.handleLoginFailure(error);
            throw error;
        }
    }

    /**
     * Load full staff profile
     */
    async loadStaffProfile() {
        try {
            const profile = await API.getProfile();
            this.currentStaff = { ...this.currentStaff, ...profile };
            Storage.setLocalData('currentStaff', this.currentStaff);
        } catch (error) {
            console.warn('Failed to load staff profile:', error);
        }
    }

    /**
     * Handle login failure
     */
    handleLoginFailure(error) {
        this.loginAttempts++;
        Storage.setLocalData('loginAttempts', {
            count: this.loginAttempts,
            lastAttempt: new Date().toISOString()
        });

        if (this.loginAttempts >= this.maxLoginAttempts) {
            const lockoutTime = new Date(Date.now() + this.lockoutDuration);
            Storage.setLocalData('loginLockout', {
                lockedAt: new Date().toISOString(),
                unlockTime: lockoutTime.toISOString()
            });
        }

        this.dispatchAuthEvent('loginError', { 
            error: error.message || '登入失敗',
            attempts: this.loginAttempts,
            maxAttempts: this.maxLoginAttempts
        });
    }

    /**
     * Staff logout
     */
    async logout() {
        try {
            this.clearSession();
            this.dispatchAuthEvent('logout');
            
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Clear authentication session
     */
    clearSession() {
        this.authToken = null;
        this.currentStaff = null;
        
        API.clearAuthToken();
        Storage.removeLocalData('authToken');
        Storage.removeLocalData('currentStaff');
        Storage.removeLocalData('selectedEvent');
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!(this.authToken && this.currentStaff);
    }

    /**
     * Get current staff info
     */
    getCurrentStaff() {
        return this.currentStaff;
    }

    /**
     * Check if login is locked out
     */
    isLockedOut() {
        const lockoutData = Storage.getLocalData('loginLockout');
        if (!lockoutData) return false;

        const unlockTime = new Date(lockoutData.unlockTime);
        return new Date() < unlockTime;
    }

    /**
     * Get lockout information
     */
    getLockoutInfo() {
        const lockoutData = Storage.getLocalData('loginLockout');
        if (!lockoutData) return null;

        return {
            lockedAt: new Date(lockoutData.lockedAt),
            unlockTime: new Date(lockoutData.unlockTime),
            remainingTime: Math.max(0, new Date(lockoutData.unlockTime) - new Date())
        };
    }

    /**
     * Clear login attempts
     */
    clearLoginAttempts() {
        this.loginAttempts = 0;
        Storage.removeLocalData('loginAttempts');
        Storage.removeLocalData('loginLockout');
    }

    /**
     * Load saved login attempts
     */
    loadLoginAttempts() {
        const attemptsData = Storage.getLocalData('loginAttempts');
        if (attemptsData) {
            const lastAttempt = new Date(attemptsData.lastAttempt);
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            
            if (lastAttempt > oneHourAgo) {
                this.loginAttempts = attemptsData.count;
            } else {
                this.clearLoginAttempts();
            }
        }
    }

    /**
     * Refresh authentication token
     */
    async refreshToken() {
        try {
            // If we have a valid session, try to refresh
            if (this.isAuthenticated()) {
                await this.validateSession();
                return true;
            }
            return false;
        } catch (error) {
            console.warn('Token refresh failed:', error);
            this.clearSession();
            return false;
        }
    }

    /**
     * Get session info
     */
    getSessionInfo() {
        return {
            isAuthenticated: this.isAuthenticated(),
            staff: this.currentStaff,
            lastLogin: Storage.getLocalData('lastLogin'),
            loginAttempts: this.loginAttempts,
            isLockedOut: this.isLockedOut(),
            lockoutInfo: this.getLockoutInfo()
        };
    }

    /**
     * Auto-login with saved credentials (if enabled)
     */
    async autoLogin() {
        try {
            const savedCredentials = Storage.getLocalData('savedCredentials');
            if (savedCredentials && savedCredentials.rememberMe) {
                // Only auto-login if last login was recent
                const lastLogin = Storage.getLocalData('lastLogin');
                if (lastLogin) {
                    const lastLoginDate = new Date(lastLogin);
                    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    
                    if (lastLoginDate > oneDayAgo) {
                        return await this.validateSession();
                    }
                }
            }
            return false;
        } catch (error) {
            console.warn('Auto-login failed:', error);
            return false;
        }
    }

    /**
     * Save login credentials (if user opts in)
     */
    saveCredentials(credentials, rememberMe = false) {
        if (rememberMe) {
            // Only save non-sensitive data
            Storage.setLocalData('savedCredentials', {
                username: credentials.username,
                rememberMe: true,
                savedAt: new Date().toISOString()
            });
        } else {
            Storage.removeLocalData('savedCredentials');
        }
    }

    /**
     * Get saved credentials
     */
    getSavedCredentials() {
        return Storage.getLocalData('savedCredentials');
    }

    /**
     * Dispatch authentication events
     */
    dispatchAuthEvent(type, detail = {}) {
        window.dispatchEvent(new CustomEvent(`auth:${type}`, { detail }));
    }

    /**
     * Setup auth event listeners
     */
    setupEventListeners() {
        // Handle network status changes
        window.addEventListener('online', () => {
            if (this.isAuthenticated()) {
                this.validateSession();
            }
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isAuthenticated()) {
                this.validateSession();
            }
        });

        // Handle storage changes (multi-tab sync)
        window.addEventListener('storage', (event) => {
            if (event.key === 'authToken') {
                if (!event.newValue) {
                    // Token was cleared in another tab
                    this.clearSession();
                    this.dispatchAuthEvent('logout', { reason: 'external' });
                }
            }
        });
    }

    /**
     * Check password strength (for future use)
     */
    checkPasswordStrength(password) {
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            numbers: /\d/.test(password),
            symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        const score = Object.values(checks).filter(Boolean).length;
        
        return {
            score,
            strength: score < 2 ? 'weak' : score < 4 ? 'medium' : 'strong',
            checks
        };
    }

    /**
     * Generate secure login code (for testing)
     */
    generateLoginCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}

// Create singleton instance
const Auth = new AuthManager();

// Setup event listeners
Auth.setupEventListeners();

// Load saved login attempts
Auth.loadLoginAttempts();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
} else {
    window.Auth = Auth;
}

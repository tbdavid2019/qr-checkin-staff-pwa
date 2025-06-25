// QR Check-in Staff PWA - Main Application

/**
 * Main application controller for QR Check-in Staff PWA
 */
class QRStaffApp {
    constructor() {
        this.currentPage = 'loading';
        this.selectedEvent = null;
        this.isInitialized = false;
        this.toastTimeout = null;
        
        this.pages = {
            loading: document.getElementById('loading-screen'),
            login: document.getElementById('login-page'),
            dashboard: document.getElementById('dashboard-page'),
            scanner: document.getElementById('scanner-page'),
            stats: document.getElementById('stats-page')
        };
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('App: Initializing...');
            
            // Initialize storage
            await Storage.init();
            
            // Load auth token and check session
            API.loadAuthToken();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup network status monitoring
            this.setupNetworkMonitoring();
            
            // Check authentication state
            const isAuthenticated = await this.checkAuthState();
            
            if (isAuthenticated) {
                await this.showDashboard();
            } else {
                this.showLogin();
            }
            
            this.isInitialized = true;
            this.hidePage('loading');
            
            console.log('App: Initialized successfully');
            
        } catch (error) {
            console.error('App: Initialization failed:', error);
            this.showError('應用程式初始化失敗: ' + error.message);
        }
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Auth events
        window.addEventListener('auth:login', (e) => this.handleAuthLogin(e.detail));
        window.addEventListener('auth:logout', (e) => this.handleAuthLogout(e.detail));
        window.addEventListener('auth:loginError', (e) => this.handleAuthError(e.detail));

        // Sync events
        window.addEventListener('sync:syncStart', () => this.handleSyncStart());
        window.addEventListener('sync:syncSuccess', (e) => this.handleSyncSuccess(e.detail));
        window.addEventListener('sync:syncError', (e) => this.handleSyncError(e.detail));
        window.addEventListener('sync:downloadSuccess', (e) => this.handleDownloadSuccess(e.detail));

        // Form submissions
        this.setupFormListeners();
        
        // Navigation
        this.setupNavigationListeners();
        
        // Page-specific events
        this.setupPageEventListeners();
        
        // PWA install prompt
        this.setupPWAInstallPrompt();
    }

    /**
     * Setup form event listeners
     */
    setupFormListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Input enter key handling
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const activeElement = document.activeElement;
                if (activeElement && activeElement.form) {
                    const submitBtn = activeElement.form.querySelector('button[type="submit"]');
                    if (submitBtn && !submitBtn.disabled) {
                        submitBtn.click();
                    }
                }
            }
        });
    }

    /**
     * Setup navigation event listeners
     */
    setupNavigationListeners() {
        // Back buttons
        document.getElementById('back-from-scanner')?.addEventListener('click', () => {
            this.showDashboard();
        });
        
        document.getElementById('back-from-stats')?.addEventListener('click', () => {
            this.showDashboard();
        });

        // Logout button
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            this.handleLogout();
        });

        // Sync button
        document.getElementById('sync-btn')?.addEventListener('click', () => {
            Sync.syncNow();
        });

        // Quick action buttons
        document.getElementById('scan-btn')?.addEventListener('click', () => {
            this.showScanner();
        });
        
        document.getElementById('stats-btn')?.addEventListener('click', () => {
            this.showStats();
        });
    }

    /**
     * Setup page-specific event listeners
     */
    setupPageEventListeners() {
        // Dashboard events
        document.getElementById('download-data-btn')?.addEventListener('click', () => {
            this.downloadEventData();
        });

        // Scanner events
        document.getElementById('toggle-flash')?.addEventListener('click', () => {
            QRScanner.toggleFlash();
        });
        
        document.getElementById('switch-camera')?.addEventListener('click', () => {
            QRScanner.switchCamera();
        });
        
        document.getElementById('confirm-checkin')?.addEventListener('click', () => {
            this.confirmCheckin();
        });
        
        document.getElementById('cancel-checkin')?.addEventListener('click', () => {
            this.cancelCheckin();
        });

        // Stats events
        document.getElementById('refresh-stats')?.addEventListener('click', () => {
            this.refreshStats();
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
    }

    /**
     * Setup network monitoring
     */
    setupNetworkMonitoring() {
        const networkStatus = document.getElementById('network-status');
        const networkText = document.getElementById('network-text');
        
        const updateNetworkStatus = () => {
            const isOnline = Utils.isOnline();
            
            if (isOnline) {
                networkStatus.classList.add('online');
                networkStatus.classList.remove('show');
                networkText.textContent = '已連線';
            } else {
                networkStatus.classList.remove('online');
                networkStatus.classList.add('show');
                networkText.textContent = '離線模式';
            }
        };

        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);
        
        updateNetworkStatus();
    }

    /**
     * Setup PWA install prompt
     */
    setupPWAInstallPrompt() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install button or notification
            this.showToast('可以將此應用程式安裝到主畫面', 'info', 5000);
        });

        window.addEventListener('appinstalled', () => {
            this.showToast('應用程式安裝成功！', 'success');
            deferredPrompt = null;
        });
    }

    /**
     * Check authentication state
     */
    async checkAuthState() {
        try {
            if (Auth.isAuthenticated()) {
                return await Auth.validateSession();
            }
            return false;
        } catch (error) {
            console.error('App: Auth state check failed:', error);
            return false;
        }
    }

    /**
     * Handle login form submission
     */
    async handleLogin(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const loginBtn = document.getElementById('login-btn');
        const errorDiv = document.getElementById('login-error');
        
        // Show loading state
        this.setButtonLoading(loginBtn, true);
        this.hideElement(errorDiv);
        
        try {
            const credentials = {
                username: formData.get('username'),
                password: formData.get('password'),
                loginCode: formData.get('login_code')
            };
            
            const result = await Auth.login(credentials);
            
            if (result.success) {
                this.showToast(`歡迎，${result.staff.full_name}！`, 'success');
                await this.showDashboard();
            }
            
        } catch (error) {
            console.error('App: Login failed:', error);
            this.showError(error.message, errorDiv);
        } finally {
            this.setButtonLoading(loginBtn, false);
        }
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            await Auth.logout();
            this.showToast('已成功登出', 'info');
            this.showLogin();
        } catch (error) {
            console.error('App: Logout failed:', error);
            this.showError('登出失敗: ' + error.message);
        }
    }

    /**
     * Handle auth login event
     */
    async handleAuthLogin(detail) {
        console.log('App: User logged in:', detail.staff.full_name);
        await this.loadEvents();
    }

    /**
     * Handle auth logout event
     */
    handleAuthLogout(detail) {
        console.log('App: User logged out, reason:', detail?.reason);
        this.selectedEvent = null;
        this.showLogin();
    }

    /**
     * Handle auth error event
     */
    handleAuthError(detail) {
        console.error('App: Auth error:', detail.error);
        this.showError(detail.error);
    }

    /**
     * Show login page
     */
    showLogin() {
        this.currentPage = 'login';
        this.hideAllPages();
        this.showPage('login');
        
        // Focus on first input
        const firstInput = this.pages.login.querySelector('input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    /**
     * Show dashboard page
     */
    async showDashboard() {
        this.currentPage = 'dashboard';
        this.hideAllPages();
        this.showPage('dashboard');
        
        // Update staff info
        this.updateStaffInfo();
        
        // Load events
        await this.loadEvents();
        
        // Update statistics
        this.updateStatistics();
    }

    /**
     * Show scanner page
     */
    async showScanner() {
        if (!this.selectedEvent) {
            this.showError('請先選擇活動');
            return;
        }

        this.currentPage = 'scanner';
        this.hideAllPages();
        this.showPage('scanner');
        
        // Initialize and start scanner
        await this.initializeScanner();
    }

    /**
     * Show stats page
     */
    async showStats() {
        if (!this.selectedEvent) {
            this.showError('請先選擇活動');
            return;
        }

        this.currentPage = 'stats';
        this.hideAllPages();
        this.showPage('stats');
        
        // Load statistics
        await this.loadStatistics();
    }

    /**
     * Update staff information display
     */
    updateStaffInfo() {
        const staff = Auth.getCurrentStaff();
        if (staff) {
            const nameElement = document.getElementById('staff-name');
            if (nameElement) {
                nameElement.textContent = staff.full_name || '員工';
            }
        }
    }

    /**
     * Load events for current staff
     */
    async loadEvents() {
        const eventsList = document.getElementById('events-list');
        const eventsLoading = document.getElementById('events-loading');
        const downloadBtn = document.getElementById('download-data-btn');
        
        try {
            this.showElement(eventsLoading);
            this.hideElement(eventsList);
            
            const events = await API.getStaffEvents();
            
            if (events && events.length > 0) {
                this.renderEventsList(events);
                this.showElement(eventsList);
            } else {
                eventsList.innerHTML = '<p class="empty-state">沒有可用的活動</p>';
                this.showElement(eventsList);
            }
            
        } catch (error) {
            console.error('App: Failed to load events:', error);
            eventsList.innerHTML = '<p class="error-state">載入活動失敗</p>';
            this.showElement(eventsList);
        } finally {
            this.hideElement(eventsLoading);
        }
    }

    /**
     * Render events list
     */
    renderEventsList(events) {
        const eventsList = document.getElementById('events-list');
        
        eventsList.innerHTML = events.map(event => `
            <div class="event-item ${this.selectedEvent?.event_id === event.event_id ? 'selected' : ''}" 
                 data-event-id="${event.event_id}">
                <div class="event-info">
                    <h4>${Utils.sanitizeHTML(event.event_name)}</h4>
                    <div class="event-permissions">
                        ${event.can_checkin ? '<span class="permission-badge">可簽到</span>' : ''}
                        ${event.can_revoke ? '<span class="permission-badge">可撤銷</span>' : ''}
                    </div>
                </div>
                <button class="btn btn-sm ${this.selectedEvent?.event_id === event.event_id ? 'btn-success' : 'btn-secondary'}" 
                        onclick="app.selectEvent(${event.event_id})">
                    ${this.selectedEvent?.event_id === event.event_id ? '已選擇' : '選擇'}
                </button>
            </div>
        `).join('');
    }

    /**
     * Select an event
     */
    async selectEvent(eventId) {
        try {
            const events = await Storage.getEvents();
            const event = events.find(e => e.event_id === eventId);
            
            if (event) {
                this.selectedEvent = event;
                Storage.setLocalData('selectedEvent', event);
                
                // Update UI
                this.updateSelectedEventDisplay();
                this.updateActionButtons();
                await this.loadEvents(); // Refresh to show selection
                
                this.showToast(`已選擇活動：${event.event_name}`, 'success');
            }
            
        } catch (error) {
            console.error('App: Failed to select event:', error);
            this.showError('選擇活動失敗');
        }
    }

    /**
     * Update selected event display
     */
    updateSelectedEventDisplay() {
        const selectedEventElement = document.getElementById('selected-event');
        if (selectedEventElement) {
            if (this.selectedEvent) {
                selectedEventElement.textContent = this.selectedEvent.event_name;
                selectedEventElement.classList.remove('no-event');
            } else {
                selectedEventElement.textContent = '未選擇活動';
                selectedEventElement.classList.add('no-event');
            }
        }
    }

    /**
     * Update action buttons state
     */
    updateActionButtons() {
        const scanBtn = document.getElementById('scan-btn');
        const statsBtn = document.getElementById('stats-btn');
        const downloadBtn = document.getElementById('download-data-btn');
        
        const hasEvent = !!this.selectedEvent;
        
        if (scanBtn) scanBtn.disabled = !hasEvent;
        if (statsBtn) statsBtn.disabled = !hasEvent;
        
        if (downloadBtn) {
            downloadBtn.disabled = !hasEvent;
            if (hasEvent) {
                this.showElement(downloadBtn);
            } else {
                this.hideElement(downloadBtn);
            }
        }
    }

    /**
     * Download event data for offline use
     */
    async downloadEventData() {
        if (!this.selectedEvent) {
            this.showError('請先選擇活動');
            return;
        }

        const downloadBtn = document.getElementById('download-data-btn');
        this.setButtonLoading(downloadBtn, true, '下載中...');
        
        try {
            await Sync.downloadEventData(this.selectedEvent.event_id);
            this.showToast('活動資料下載完成', 'success');
            this.updateStatistics();
            
        } catch (error) {
            console.error('App: Failed to download event data:', error);
            this.showError('下載活動資料失敗: ' + error.message);
        } finally {
            this.setButtonLoading(downloadBtn, false);
        }
    }

    // Continue with more methods...
    // Due to length constraints, I'll create this in parts

    /**
     * Update statistics display
     */
    async updateStatistics() {
        try {
            const stats = await Storage.getStats(this.selectedEvent?.event_id);
            
            const elements = {
                totalTickets: document.getElementById('total-tickets'),
                checkedIn: document.getElementById('checked-in'),
                pendingSync: document.getElementById('pending-sync')
            };
            
            if (elements.totalTickets) elements.totalTickets.textContent = stats.totalTickets;
            if (elements.checkedIn) elements.checkedIn.textContent = stats.checkedInTickets;
            if (elements.pendingSync) elements.pendingSync.textContent = stats.pendingSync;
            
        } catch (error) {
            console.error('App: Failed to update statistics:', error);
        }
    }

    /**
     * Initialize QR scanner
     */
    async initializeScanner() {
        try {
            // Setup scanner callbacks
            QRScanner.setCallbacks({
                onScan: (qrData) => this.handleQRScan(qrData),
                onError: (error) => this.handleScannerError(error),
                onStart: () => console.log('Scanner started'),
                onStop: () => console.log('Scanner stopped')
            });
            
            // Initialize and start scanner
            const initialized = await QRScanner.init();
            if (initialized) {
                await QRScanner.startScanning();
            }
            
        } catch (error) {
            console.error('App: Scanner initialization failed:', error);
            this.showError('掃描器初始化失敗: ' + error.message);
        }
    }

    /**
     * Handle QR scan result
     */
    async handleQRScan(qrData) {
        try {
            console.log('App: QR scanned:', qrData);
            
            // Stop scanning temporarily
            await QRScanner.stopScanning();
            
            // Get ticket information
            let ticketInfo = null;
            
            if (qrData.type === 'uuid') {
                ticketInfo = await this.getTicketInfo(qrData.uuid);
            } else if (qrData.type === 'token') {
                // Handle QR token directly
                this.currentQRToken = qrData.token;
                // For tokens, we might need to decode to get ticket info
                ticketInfo = { qr_token: qrData.token };
            } else {
                throw new Error('不支援的 QR Code 格式');
            }
            
            if (ticketInfo) {
                this.displayTicketInfo(ticketInfo);
                this.showElement(document.getElementById('scanner-result'));
            } else {
                throw new Error('無法獲取票券資訊');
            }
            
        } catch (error) {
            console.error('App: QR scan handling failed:', error);
            this.showError(error.message);
            // Restart scanning
            setTimeout(() => QRScanner.startScanning(), 2000);
        }
    }

    /**
     * Get ticket information
     */
    async getTicketInfo(uuid) {
        try {
            // Try local storage first (offline)
            const localTicket = await Storage.getTicketByUUID(uuid);
            if (localTicket) {
                return localTicket;
            }
            
            // Try API if online
            if (Utils.isOnline()) {
                const publicTicket = await API.getPublicTicket(uuid);
                const qrToken = await API.getQRToken(uuid);
                
                return {
                    ...publicTicket,
                    qr_token: qrToken.qr_token
                };
            }
            
            throw new Error('票券不存在或網路離線');
            
        } catch (error) {
            console.error('App: Failed to get ticket info:', error);
            throw error;
        }
    }

    /**
     * Display ticket information
     */
    displayTicketInfo(ticketInfo) {
        const elements = {
            holderName: document.getElementById('holder-name'),
            eventName: document.getElementById('event-name'),
            ticketStatus: document.getElementById('ticket-status'),
            ticketDescription: document.getElementById('ticket-description')
        };
        
        if (elements.holderName) {
            elements.holderName.textContent = ticketInfo.holder_name || '-';
        }
        
        if (elements.eventName) {
            elements.eventName.textContent = this.selectedEvent?.event_name || '-';
        }
        
        if (elements.ticketStatus) {
            const status = ticketInfo.is_used ? '已使用' : '有效';
            const statusClass = ticketInfo.is_used ? 'used' : 'valid';
            elements.ticketStatus.textContent = status;
            elements.ticketStatus.className = `status-badge ${statusClass}`;
        }
        
        if (elements.ticketDescription) {
            const description = ticketInfo.description || '無';
            elements.ticketDescription.textContent = description;
        }
        
        // Store current ticket for check-in
        this.currentTicket = ticketInfo;
        this.currentQRToken = ticketInfo.qr_token;
    }

    /**
     * Confirm check-in
     */
    async confirmCheckin() {
        if (!this.currentTicket || !this.currentQRToken) {
            this.showError('沒有有效的票券資訊');
            return;
        }

        const confirmBtn = document.getElementById('confirm-checkin');
        this.setButtonLoading(confirmBtn, true, '處理中...');
        
        try {
            if (Utils.isOnline()) {
                // Online check-in
                const result = await API.checkinTicket(this.currentQRToken, this.selectedEvent.event_id);
                this.showToast('簽到成功！', 'success');
                
                // Update local ticket status
                if (this.currentTicket.id) {
                    const updatedTicket = { ...this.currentTicket, is_used: true };
                    await Storage.updateTicket(updatedTicket);
                }
                
            } else {
                // Offline check-in
                await this.saveOfflineCheckin();
                this.showToast('離線簽到已記錄，將在連線時同步', 'info');
            }
            
            // Reset and go back to scanning
            this.resetScanner();
            
        } catch (error) {
            console.error('App: Check-in failed:', error);
            
            if (error.message?.includes('already checked')) {
                this.showError('此票券已經簽到過了');
            } else {
                // Save as offline check-in if online check-in fails
                try {
                    await this.saveOfflineCheckin();
                    this.showToast('簽到已暫存，將稍後同步', 'warning');
                    this.resetScanner();
                } catch (offlineError) {
                    this.showError('簽到失敗: ' + error.message);
                }
            }
        } finally {
            this.setButtonLoading(confirmBtn, false);
        }
    }

    /**
     * Save offline check-in
     */
    async saveOfflineCheckin() {
        const checkinData = {
            ticket_id: this.currentTicket.id,
            event_id: this.selectedEvent.event_id,
            checkin_time: new Date().toISOString(),
            qr_token: this.currentQRToken,
            holder_name: this.currentTicket.holder_name
        };
        
        await Storage.saveCheckin(checkinData);
        
        // Update local ticket status
        if (this.currentTicket.id) {
            const updatedTicket = { ...this.currentTicket, is_used: true };
            await Storage.updateTicket(updatedTicket);
        }
        
        this.updateStatistics();
    }

    /**
     * Cancel check-in
     */
    cancelCheckin() {
        this.resetScanner();
    }

    /**
     * Reset scanner to scanning state
     */
    async resetScanner() {
        this.hideElement(document.getElementById('scanner-result'));
        this.currentTicket = null;
        this.currentQRToken = null;
        
        // Restart scanning
        await QRScanner.startScanning();
    }

    /**
     * Handle scanner errors
     */
    handleScannerError(error) {
        console.error('App: Scanner error:', error);
        this.showError(error.message || '掃描器錯誤');
    }

    // Utility methods for UI management
    showPage(pageId) {
        const page = this.pages[pageId];
        if (page) {
            page.classList.remove('hidden');
        }
    }

    hidePage(pageId) {
        const page = this.pages[pageId];
        if (page) {
            page.classList.add('hidden');
        }
    }

    hideAllPages() {
        Object.keys(this.pages).forEach(pageId => {
            this.hidePage(pageId);
        });
    }

    showElement(element) {
        if (element) {
            element.classList.remove('hidden');
        }
    }

    hideElement(element) {
        if (element) {
            element.classList.add('hidden');
        }
    }

    setButtonLoading(button, loading, loadingText = '載入中...') {
        if (!button) return;
        
        const btnText = button.querySelector('.btn-text');
        const btnLoading = button.querySelector('.btn-loading');
        
        if (loading) {
            button.disabled = true;
            if (btnText) btnText.style.opacity = '0';
            if (btnLoading) {
                btnLoading.style.opacity = '1';
                btnLoading.querySelector('span:last-child').textContent = loadingText;
            }
        } else {
            button.disabled = false;
            if (btnText) btnText.style.opacity = '1';
            if (btnLoading) btnLoading.style.opacity = '0';
        }
    }

    showError(message, container = null) {
        if (container) {
            container.textContent = message;
            container.classList.remove('hidden');
        } else {
            this.showToast(message, 'error');
        }
    }

    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        // Clear existing timeout
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        
        // Create toast element
        const toast = Utils.createElement('div', {
            className: `toast ${type}`,
            innerHTML: Utils.sanitizeHTML(message)
        });
        
        container.appendChild(toast);
        
        // Auto remove
        this.toastTimeout = setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, duration);
    }

    // Sync event handlers
    handleSyncStart() {
        const syncBtn = document.getElementById('sync-btn');
        if (syncBtn) {
            syncBtn.classList.add('syncing');
        }
    }

    handleSyncSuccess(detail) {
        const syncBtn = document.getElementById('sync-btn');
        if (syncBtn) {
            syncBtn.classList.remove('syncing');
        }
        
        this.showToast('同步完成', 'success');
        this.updateStatistics();
    }

    handleSyncError(detail) {
        const syncBtn = document.getElementById('sync-btn');
        if (syncBtn) {
            syncBtn.classList.remove('syncing');
        }
        
        this.showToast('同步失敗', 'error');
    }

    handleDownloadSuccess(detail) {
        this.showToast(`活動資料下載完成 (${detail.ticketCount} 張票券)`, 'success');
        this.updateStatistics();
    }

    // Stats page methods
    async loadStatistics() {
        // Implementation for stats page
        // This would load and display detailed statistics
    }

    refreshStats() {
        this.loadStatistics();
    }

    switchTab(tabName) {
        // Tab switching logic for stats page
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        const activePane = document.getElementById(`${tabName}-tab`);
        
        if (activeBtn) activeBtn.classList.add('active');
        if (activePane) activePane.classList.add('active');
    }

    /**
     * Cleanup when app is destroyed
     */
    cleanup() {
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        
        QRScanner.cleanup();
        Sync.cleanup();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new QRStaffApp();
});

// Export for global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QRStaffApp;
} else {
    window.QRStaffApp = QRStaffApp;
}

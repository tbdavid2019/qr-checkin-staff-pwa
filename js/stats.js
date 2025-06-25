// QR Check-in Staff PWA - Statistics Module

/**
 * Statistics management for QR Check-in Staff PWA
 */
class StatsManager {
    constructor() {
        this.chartInstances = {};
        this.refreshInterval = null;
    }

    /**
     * Initialize stats page
     */
    async init() {
        console.log('Stats: Initializing...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial stats
        await this.loadStats();
        
        // Setup auto-refresh
        this.setupAutoRefresh();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Event filter change
        const eventSelect = document.getElementById('stats-event-select');
        if (eventSelect) {
            eventSelect.addEventListener('change', () => {
                this.loadStats();
            });
        }

        // Date range filters
        const dateFromInput = document.getElementById('stats-date-from');
        const dateToInput = document.getElementById('stats-date-to');
        
        if (dateFromInput && dateToInput) {
            dateFromInput.addEventListener('change', () => this.loadStats());
            dateToInput.addEventListener('change', () => this.loadStats());
        }

        // Refresh button
        const refreshBtn = document.getElementById('stats-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadStats(true);
            });
        }

        // Export button
        const exportBtn = document.getElementById('stats-export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportStats();
            });
        }
    }

    /**
     * Load statistics data
     */
    async loadStats(showLoading = false) {
        try {
            if (showLoading) {
                this.showLoading();
            }

            const selectedEventId = document.getElementById('stats-event-select')?.value;
            const dateFrom = document.getElementById('stats-date-from')?.value;
            const dateTo = document.getElementById('stats-date-to')?.value;

            if (!selectedEventId) {
                console.log('Stats: No event selected');
                this.showNoEventSelected();
                return;
            }

            // Get stats from API
            const stats = await this.fetchEventStats(selectedEventId, dateFrom, dateTo);
            
            // Update UI
            this.updateStatsUI(stats);
            
            // Update charts
            this.updateCharts(stats);

            this.hideLoading();
            
        } catch (error) {
            console.error('Stats: Failed to load stats:', error);
            Utils.showToast('載入統計資料失敗', 'error');
            this.hideLoading();
        }
    }

    /**
     * Fetch event statistics from API
     */
    async fetchEventStats(eventId, dateFrom, dateTo) {
        try {
            // Build query parameters
            const params = new URLSearchParams();
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);

            const queryString = params.toString() ? `?${params.toString()}` : '';
            
            // Fetch from API
            const response = await API.makeRequest(
                `GET`,
                `/staff/events/${eventId}/stats${queryString}`
            );

            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.error || 'Failed to fetch stats');
            }

        } catch (error) {
            console.error('Stats: API error:', error);
            
            // Try to get cached stats from local storage
            const cachedStats = await Storage.get(`event_stats_${eventId}`);
            if (cachedStats) {
                console.log('Stats: Using cached data');
                return cachedStats;
            }
            
            throw error;
        }
    }

    /**
     * Update stats UI with data
     */
    updateStatsUI(stats) {
        // Update summary cards
        this.updateSummaryCards(stats.summary || {});
        
        // Update recent activity
        this.updateRecentActivity(stats.recent_checkins || []);
        
        // Update ticket type breakdown
        this.updateTicketTypeBreakdown(stats.ticket_types || []);
        
        // Update hourly breakdown
        this.updateHourlyBreakdown(stats.hourly_checkins || []);
    }

    /**
     * Update summary cards
     */
    updateSummaryCards(summary) {
        const elements = {
            'total-checkins': summary.total_checkins || 0,
            'unique-attendees': summary.unique_attendees || 0,
            'checkin-rate': `${(summary.checkin_rate || 0).toFixed(1)}%`,
            'avg-checkin-time': summary.avg_checkin_time || '0s'
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    /**
     * Update recent activity list
     */
    updateRecentActivity(recentCheckins) {
        const container = document.getElementById('recent-activity-list');
        if (!container) return;

        if (recentCheckins.length === 0) {
            container.innerHTML = '<div class="no-data">目前沒有簽到記錄</div>';
            return;
        }

        const html = recentCheckins.map(checkin => `
            <div class="activity-item">
                <div class="activity-info">
                    <div class="activity-ticket">${checkin.ticket_code || 'Unknown'}</div>
                    <div class="activity-type">${checkin.ticket_type || 'Unknown Type'}</div>
                    <div class="activity-time">${Utils.formatDateTime(checkin.checkin_time)}</div>
                </div>
                <div class="activity-status ${checkin.status === 'success' ? 'success' : 'error'}">
                    ${checkin.status === 'success' ? '成功' : '失敗'}
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    /**
     * Update ticket type breakdown
     */
    updateTicketTypeBreakdown(ticketTypes) {
        const container = document.getElementById('ticket-type-breakdown');
        if (!container) return;

        if (ticketTypes.length === 0) {
            container.innerHTML = '<div class="no-data">沒有票種資料</div>';
            return;
        }

        const html = ticketTypes.map(type => {
            const percentage = type.total > 0 ? (type.checked_in / type.total * 100).toFixed(1) : 0;
            
            return `
                <div class="ticket-type-item">
                    <div class="ticket-type-info">
                        <div class="ticket-type-name">${type.name}</div>
                        <div class="ticket-type-stats">${type.checked_in} / ${type.total}</div>
                    </div>
                    <div class="ticket-type-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%"></div>
                        </div>
                        <div class="progress-text">${percentage}%</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    /**
     * Update hourly breakdown
     */
    updateHourlyBreakdown(hourlyData) {
        const container = document.getElementById('hourly-breakdown');
        if (!container) return;

        if (hourlyData.length === 0) {
            container.innerHTML = '<div class="no-data">沒有時段資料</div>';
            return;
        }

        const maxCount = Math.max(...hourlyData.map(h => h.count));
        
        const html = hourlyData.map(hour => {
            const percentage = maxCount > 0 ? (hour.count / maxCount * 100) : 0;
            
            return `
                <div class="hour-item">
                    <div class="hour-label">${hour.hour}:00</div>
                    <div class="hour-bar">
                        <div class="hour-fill" style="height: ${percentage}%"></div>
                    </div>
                    <div class="hour-count">${hour.count}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    /**
     * Update charts (if using Chart.js or similar)
     */
    updateCharts(stats) {
        // This is a placeholder for chart implementation
        // You can integrate Chart.js or other charting libraries here
        console.log('Stats: Charts update placeholder', stats);
    }

    /**
     * Export statistics
     */
    async exportStats() {
        try {
            const selectedEventId = document.getElementById('stats-event-select')?.value;
            if (!selectedEventId) {
                Utils.showToast('請先選擇活動', 'error');
                return;
            }

            const dateFrom = document.getElementById('stats-date-from')?.value;
            const dateTo = document.getElementById('stats-date-to')?.value;

            // Build export parameters
            const params = new URLSearchParams();
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);
            params.append('format', 'csv');

            const queryString = params.toString() ? `?${params.toString()}` : '';

            Utils.showToast('正在準備匯出檔案...', 'info');

            // Request export from API
            const response = await API.makeRequest(
                'GET',
                `/staff/events/${selectedEventId}/export${queryString}`
            );

            if (response.success) {
                // Create and download file
                const blob = new Blob([response.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `event_${selectedEventId}_stats_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                Utils.showToast('統計資料已匯出', 'success');
            } else {
                throw new Error(response.error || 'Export failed');
            }

        } catch (error) {
            console.error('Stats: Export failed:', error);
            Utils.showToast('匯出失敗', 'error');
        }
    }

    /**
     * Setup auto-refresh
     */
    setupAutoRefresh() {
        // Refresh every 30 seconds when stats page is active
        this.refreshInterval = setInterval(() => {
            if (document.getElementById('stats-page').style.display !== 'none') {
                this.loadStats();
            }
        }, 30000);
    }

    /**
     * Clear auto-refresh
     */
    clearAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        const refreshBtn = document.getElementById('stats-refresh-btn');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            refreshBtn.disabled = true;
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const refreshBtn = document.getElementById('stats-refresh-btn');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
            refreshBtn.disabled = false;
        }
    }

    /**
     * Show no event selected message
     */
    showNoEventSelected() {
        const containers = [
            'recent-activity-list',
            'ticket-type-breakdown',
            'hourly-breakdown'
        ];

        containers.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = '<div class="no-data">請先選擇活動</div>';
            }
        });

        // Clear summary cards
        this.updateSummaryCards({});
    }

    /**
     * Reset stats page
     */
    reset() {
        this.clearAutoRefresh();
        
        // Clear charts
        Object.values(this.chartInstances).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.chartInstances = {};
    }

    /**
     * Cleanup
     */
    destroy() {
        this.reset();
    }
}

// Create global Stats instance
window.Stats = new StatsManager();

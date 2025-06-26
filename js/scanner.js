// QR Check-in Staff PWA - QR Scanner Management

/**
 * QR Code scanner functionality using device camera
 */
class QRScannerManager {
    constructor() {
        this.scanner = null;
        this.isScanning = false;
        this.video = null;
        this.currentStream = null;
        this.facingMode = 'environment'; // back camera
        this.flashEnabled = false;
        this.lastScanTime = 0;
        this.scanCooldown = 2000; // 2 seconds between scans
        
        this.callbacks = {
            onScan: null,
            onError: null,
            onStart: null,
            onStop: null
        };
    }

    /**
     * Initialize scanner
     */
    async init() {
        try {
            // Check if QrScanner is available
            if (typeof QrScanner === 'undefined') {
                throw new Error('QR Scanner library not loaded');
            }

            // Get video element
            this.video = document.getElementById('scanner-video');
            if (!this.video) {
                throw new Error('Scanner video element not found');
            }

            // Create QR scanner instance
            this.scanner = new QrScanner(
                this.video,
                (result) => this.handleScanResult(result),
                {
                    preferredCamera: this.facingMode,
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                    maxScansPerSecond: 5,
                    returnDetailedScanResult: true
                }
            );

            console.log('QR Scanner: Initialized successfully');
            return true;

        } catch (error) {
            console.error('QR Scanner: Initialization failed:', error);
            this.handleError(error);
            return false;
        }
    }

    /**
     * Start scanning
     */
    async startScanning() {
        try {
            if (this.isScanning) {
                console.log('QR Scanner: Already scanning');
                return true;
            }

            // Check camera permissions
            const hasPermission = await this.checkCameraPermission();
            if (!hasPermission) {
                throw new Error('攝影機權限被拒絕');
            }

            // Start the scanner
            await this.scanner.start();
            this.isScanning = true;
            
            this.updateScannerStatus('正在掃描...');
            
            if (this.callbacks.onStart) {
                this.callbacks.onStart();
            }

            console.log('QR Scanner: Started successfully');
            return true;

        } catch (error) {
            console.error('QR Scanner: Failed to start:', error);
            this.handleError(error);
            return false;
        }
    }

    /**
     * Stop scanning
     */
    async stopScanning() {
        try {
            if (!this.isScanning) {
                return true;
            }

            if (this.scanner) {
                this.scanner.stop();
            }
            
            this.isScanning = false;
            this.updateScannerStatus('已停止掃描');
            
            if (this.callbacks.onStop) {
                this.callbacks.onStop();
            }

            console.log('QR Scanner: Stopped successfully');
            return true;

        } catch (error) {
            console.error('QR Scanner: Failed to stop:', error);
            this.handleError(error);
            return false;
        }
    }

    /**
     * Handle scan result
     */
    handleScanResult(result) {
        try {
            const now = Date.now();
            
            // Implement scan cooldown to prevent rapid successive scans
            if (now - this.lastScanTime < this.scanCooldown) {
                console.log('QR Scanner: Scan cooldown active, ignoring result');
                return;
            }
            
            this.lastScanTime = now;
            
            console.log('QR Scanner: Scan result received:', result);
            console.log('QR Scanner: Raw data:', result.data || result);
            
            // Parse QR code data
            const qrData = this.parseQRData(result.data || result);
            console.log('QR Scanner: Parsed QR data:', qrData);
            
            if (qrData) {
                this.updateScannerStatus('掃描成功！');
                
                // Vibrate if supported
                if (typeof Utils !== 'undefined' && Utils.vibrate) {
                    Utils.vibrate([100, 50, 100]);
                }
                
                // Show success feedback
                this.showScanSuccess();
                
                console.log('QR Scanner: Calling onScan callback with data:', qrData);
                if (this.callbacks.onScan) {
                    this.callbacks.onScan(qrData);
                } else {
                    console.warn('QR Scanner: No onScan callback registered!');
                }
            } else {
                console.warn('QR Scanner: Failed to parse QR data');
                this.updateScannerStatus('無效的 QR Code');
                this.handleError(new Error('無效的 QR Code 格式'));
            }

        } catch (error) {
            console.error('QR Scanner: Error handling scan result:', error);
            this.handleError(error);
        }
    }

    /**
     * Parse QR code data
     */
    parseQRData(data) {
        try {
            console.log('QR Scanner: Parsing QR data:', data);
            console.log('QR Scanner: Data type:', typeof data);
            console.log('QR Scanner: Data length:', data?.length);
            
            // Try to parse as JSON first (for structured data)
            try {
                const parsed = JSON.parse(data);
                console.log('QR Scanner: Successfully parsed as JSON:', parsed);
                if (parsed.ticket_uuid || parsed.uuid) {
                    const result = {
                        type: 'json',
                        uuid: parsed.ticket_uuid || parsed.uuid,
                        data: parsed
                    };
                    console.log('QR Scanner: Returning JSON result:', result);
                    return result;
                }
            } catch (e) {
                console.log('QR Scanner: Not valid JSON, trying other formats');
            }

            // Check if it's a UUID format
            if (typeof Utils !== 'undefined' && Utils.isValidUUID && Utils.isValidUUID(data)) {
                const result = {
                    type: 'uuid',
                    uuid: data,
                    data: data
                };
                console.log('QR Scanner: Returning UUID result:', result);
                return result;
            }

            // Check if it's a URL with UUID
            try {
                const url = new URL(data);
                const pathSegments = url.pathname.split('/');
                const uuid = pathSegments[pathSegments.length - 1];
                
                if (typeof Utils !== 'undefined' && Utils.isValidUUID && Utils.isValidUUID(uuid)) {
                    const result = {
                        type: 'url',
                        uuid: uuid,
                        url: data,
                        data: data
                    };
                    console.log('QR Scanner: Returning URL result:', result);
                    return result;
                }
            } catch (e) {
                console.log('QR Scanner: Not a valid URL');
            }

            // Check if it's a QR token (JWT-like format)
            if (data.includes('.') && data.length > 50) {
                const result = {
                    type: 'token',
                    token: data,
                    data: data
                };
                console.log('QR Scanner: Returning token result:', result);
                return result;
            }

            // Default: treat as raw data
            const result = {
                type: 'raw',
                data: data
            };
            console.log('QR Scanner: Returning raw result:', result);
            return result;

        } catch (error) {
            console.error('QR Scanner: Failed to parse QR data:', error);
            return null;
        }
    }

    /**
     * Check camera permission
     */
    async checkCameraPermission() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('攝影機 API 不支援');
            }

            // Try to get camera permission
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: this.facingMode } 
            });
            
            // Stop the stream immediately as we just wanted to check permission
            stream.getTracks().forEach(track => track.stop());
            
            return true;

        } catch (error) {
            console.error('QR Scanner: Camera permission check failed:', error);
            
            if (error.name === 'NotAllowedError') {
                this.showCameraPermissionRequest();
            } else if (error.name === 'NotFoundError') {
                this.handleError(new Error('找不到攝影機設備'));
            } else {
                this.handleError(error);
            }
            
            return false;
        }
    }

    /**
     * Show camera permission request UI
     */
    showCameraPermissionRequest() {
        const viewport = document.getElementById('scanner-viewport');
        if (viewport) {
            viewport.innerHTML = `
                <div class="camera-permission">
                    <div class="camera-icon">📷</div>
                    <h3>需要攝影機權限</h3>
                    <p>請允許使用攝影機來掃描 QR Code</p>
                    <button class="btn btn-primary" onclick="QRScanner.requestCameraPermission()">
                        授權攝影機
                    </button>
                </div>
            `;
        }
    }

    /**
     * Request camera permission
     */
    async requestCameraPermission() {
        try {
            await this.checkCameraPermission();
            location.reload(); // Reload to reset scanner state
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Switch camera (front/back)
     */
    async switchCamera() {
        try {
            if (!this.scanner) {
                return false;
            }

            // Stop current scanning
            await this.stopScanning();
            
            // Switch facing mode
            this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
            
            // Update scanner preference
            this.scanner.setCamera(this.facingMode);
            
            // Restart scanning
            await this.startScanning();
            
            this.updateScannerStatus(
                this.facingMode === 'environment' ? '後鏡頭' : '前鏡頭'
            );
            
            return true;

        } catch (error) {
            console.error('QR Scanner: Failed to switch camera:', error);
            this.handleError(error);
            return false;
        }
    }

    /**
     * Toggle flash/torch
     */
    async toggleFlash() {
        try {
            if (!this.scanner) {
                return false;
            }

            const hasFlash = await this.scanner.hasFlash();
            if (!hasFlash) {
                this.handleError(new Error('此設備不支援閃光燈'));
                return false;
            }

            this.flashEnabled = !this.flashEnabled;
            await this.scanner.toggleFlash();
            
            this.updateScannerStatus(
                this.flashEnabled ? '閃光燈已開啟' : '閃光燈已關閉'
            );
            
            // Update flash button UI
            const flashBtn = document.getElementById('toggle-flash');
            if (flashBtn) {
                flashBtn.classList.toggle('active', this.flashEnabled);
            }
            
            return true;

        } catch (error) {
            console.error('QR Scanner: Failed to toggle flash:', error);
            this.handleError(error);
            return false;
        }
    }

    /**
     * Show scan success feedback
     */
    showScanSuccess() {
        const viewport = document.getElementById('scanner-viewport');
        if (viewport) {
            const successElement = document.createElement('div');
            successElement.className = 'scan-success';
            successElement.textContent = '✓';
            viewport.appendChild(successElement);
            
            setTimeout(() => {
                if (successElement.parentNode) {
                    successElement.parentNode.removeChild(successElement);
                }
            }, 600);
        }
    }

    /**
     * Update scanner status text
     */
    updateScannerStatus(message) {
        const statusElement = document.getElementById('scanner-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    /**
     * Handle scanner errors
     */
    handleError(error) {
        console.error('QR Scanner Error:', error);
        
        this.updateScannerStatus('掃描錯誤');
        
        if (this.callbacks.onError) {
            this.callbacks.onError(error);
        } else {
            // Show default error handling
            this.showScannerError(error.message || '掃描器發生錯誤');
        }
    }

    /**
     * Show scanner error UI
     */
    showScannerError(message) {
        const viewport = document.getElementById('scanner-viewport');
        if (viewport) {
            viewport.innerHTML = `
                <div class="scanner-error">
                    <h3>掃描器錯誤</h3>
                    <p>${Utils.sanitizeHTML(message)}</p>
                    <button class="btn btn-primary" onclick="QRScanner.retryScanner()">
                        重試
                    </button>
                </div>
            `;
        }
    }

    /**
     * Retry scanner after error
     */
    async retryScanner() {
        try {
            // Reset viewport
            const viewport = document.getElementById('scanner-viewport');
            if (viewport) {
                viewport.innerHTML = `
                    <video id="scanner-video" class="scanner-video" autoplay playsinline></video>
                    <div class="scanner-overlay">
                        <div class="scanner-frame">
                            <div class="scanning-line"></div>
                        </div>
                    </div>
                `;
            }
            
            // Re-initialize
            await this.init();
            await this.startScanning();
            
        } catch (error) {
            console.error('QR Scanner: Retry failed:', error);
            this.handleError(error);
        }
    }

    /**
     * Set event callbacks
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Get scanner capabilities
     */
    async getCapabilities() {
        try {
            if (!this.scanner) {
                return null;
            }

            const cameras = await QrScanner.listCameras(true);
            const hasFlash = await this.scanner.hasFlash();
            
            return {
                cameras: cameras,
                hasFlash: hasFlash,
                currentCamera: this.facingMode,
                isScanning: this.isScanning
            };

        } catch (error) {
            console.error('QR Scanner: Failed to get capabilities:', error);
            return null;
        }
    }

    /**
     * Cleanup scanner resources
     */
    cleanup() {
        this.stopScanning();
        
        if (this.scanner) {
            this.scanner.destroy();
            this.scanner = null;
        }
        
        this.callbacks = {
            onScan: null,
            onError: null,
            onStart: null,
            onStop: null
        };
    }

    /**
     * Get scanner status
     */
    getStatus() {
        return {
            isScanning: this.isScanning,
            facingMode: this.facingMode,
            flashEnabled: this.flashEnabled,
            lastScanTime: this.lastScanTime
        };
    }
}

// Create singleton instance
const QRScanner = new QRScannerManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QRScanner;
} else {
    window.QRScanner = QRScanner;
}

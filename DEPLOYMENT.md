# QR Check-in Staff PWA 部署指南

## 🚀 快速本地測試

```bash
# 方法 1: 使用內建 Python 伺服器
cd /home/ec2-user/qr-checkin-staff-pwa
python3 server.py

# 方法 2: 使用 Node.js http-server
npm install -g http-server
http-server -p 8080 -c-1

# 方法 3: 使用 Python 簡單伺服器
python3 -m http.server 8080
```

然後開啟瀏覽器訪問: `http://localhost:8080`

## 🌐 生產環境部署

### 選項 1: Cloudflare Pages (推薦)

1. **準備檔案**
   ```bash
   # 建立部署包
   cd /home/ec2-user
   tar -czf qr-staff-pwa.tar.gz qr-checkin-staff-pwa/
   ```

2. **上傳到 Git Repository**
   ```bash
   cd qr-checkin-staff-pwa
   git add .
   git commit -m "Initial PWA deployment"
   git push origin main
   ```

3. **Cloudflare Pages 設定**
   - 登入 Cloudflare Dashboard
   - 選擇 "Pages" > "Create a project"
   - 連結您的 Git repository
   - 建置設定:
     - 建置命令: `echo "Static site, no build needed"`
     - 建置輸出目錄: `/`
     - 環境變數: 
       - `API_BASE_URL`: 您的後端 API URL

4. **自訂網域設定**
   - 在 Cloudflare Pages 中設定自訂網域
   - SSL/TLS 會自動配置

### 選項 2: 傳統伺服器 + Cloudflare

1. **伺服器設定**
   ```bash
   # 複製檔案到伺服器
   scp -r qr-checkin-staff-pwa/ user@your-server:/var/www/
   
   # 設定 nginx
   sudo cp nginx.conf /etc/nginx/sites-available/qr-staff-pwa
   sudo ln -s /etc/nginx/sites-available/qr-staff-pwa /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

2. **Cloudflare 設定**
   - 添加您的網域到 Cloudflare
   - 設定 DNS A record 指向您的伺服器 IP
   - 啟用 "Always Use HTTPS"
   - 啟用 "Auto Minify" (JS, CSS, HTML)

## 🔧 後端 API 設定

您需要確保後端 API 支援 CORS 並可透過 HTTPS 訪問:

```python
# 在您的 FastAPI main.py 中
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-pwa-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 📱 PWA 功能驗證

部署後請檢查:

1. **HTTPS 必要**
   - ✅ 網站使用 HTTPS
   - ✅ Service Worker 可以註冊
   - ✅ 離線功能正常

2. **安裝功能**
   - ✅ 瀏覽器顯示 "安裝應用程式" 提示
   - ✅ 可以添加到主畫面
   - ✅ 應用程式圖示正確顯示

3. **功能測試**
   - ✅ 員工登入功能
   - ✅ QR 掃描功能
   - ✅ 離線簽到同步
   - ✅ 統計功能

## 🛠️ 環境變數設定

建立 `.env` 檔案 (不要提交到 git):

```env
# API 設定
API_BASE_URL=https://your-api-domain.com/api
API_TIMEOUT=30000

# PWA 設定
PWA_NAME=QR Check-in Staff
PWA_SHORT_NAME=QR Staff
PWA_THEME_COLOR=#2563eb

# 功能開關
ENABLE_OFFLINE_MODE=true
ENABLE_PUSH_NOTIFICATIONS=true
DEBUG_MODE=false
```

## 📊 監控設定

### Cloudflare Analytics
- 在 Cloudflare 中啟用 Web Analytics
- 監控頁面載入時間和使用者行為

### 錯誤監控
```html
<!-- 添加到 index.html 的 <head> 中 -->
<script>
window.addEventListener('error', function(e) {
    console.error('PWA Error:', e.error);
    // 可以發送到錯誤監控服務
});
</script>
```

## 🔄 更新策略

1. **程式碼更新**
   ```bash
   git push origin main  # Cloudflare Pages 會自動部署
   ```

2. **Service Worker 更新**
   - 修改 `sw.js` 中的 `CACHE_VERSION`
   - 部署後會自動提示用戶更新

3. **快取清除**
   - 在 Cloudflare 中清除快取
   - 或使用 API: `POST /client/v4/zones/{zone_id}/purge_cache`

## 🚨 故障排除

### 常見問題

1. **Service Worker 無法註冊**
   - 檢查是否使用 HTTPS
   - 檢查瀏覽器控制台錯誤

2. **API 請求失敗**
   - 檢查 CORS 設定
   - 確認 API_BASE_URL 正確

3. **PWA 無法安裝**
   - 檢查 manifest.json 語法
   - 確保圖示檔案存在

4. **離線功能不正常**
   - 檢查 Service Worker 快取策略
   - 確認網路狀態檢測

### 除錯指令

```bash
# 檢查服務狀態
sudo systemctl status nginx
sudo journalctl -f -u nginx

# 檢查檔案權限
ls -la /var/www/qr-checkin-staff-pwa/

# 測試 API 連線
curl -I https://your-api-domain.com/api/health
```

就這樣！您的 PWA 應該可以正常運作了。

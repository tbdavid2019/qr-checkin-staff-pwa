# Hugging Face Space 部署指南

## 📋 部署步驟

### 1. 準備工作
- 確保您有 Hugging Face 帳號
- 確保後端 API (office.fanpokka.ai:8000) 已設定 CORS 允許來自 Hugging Face Space 的請求

### 2. 創建 Space
1. 前往 [Hugging Face Spaces](https://huggingface.co/spaces)
2. 點擊 "Create new Space"
3. 填寫以下資訊：
   - **Space name**: `qr-checkin-staff-pwa`
   - **License**: MIT
   - **SDK**: Static
   - **Visibility**: Public 或 Private (依需求)

### 3. 上傳檔案
將以下檔案上傳到 Space：
```
├── README.md (重新命名 README_HF.md)
├── index.html
├── manifest.json
├── sw.js
├── css/
├── js/
├── icons/
├── libs/
└── screenshots/
```

### 4. API 端點設定
應用現在使用 Cloudflare Workers API：
- **API 端點**: `https://url2ticket2.ai360.workers.dev`
- **協議**: HTTPS (解決 Mixed Content 問題)
- **CORS**: Cloudflare Workers 通常已預設支援跨域請求

### 5. 測試部署
1. 等待 Space 建置完成
2. 開啟應用 URL
3. 測試以下功能：
   - 頁面載入
   - 相機權限請求
   - API 連線 (登入功能)
   - PWA 安裝提示

## 🔧 可能遇到的問題

### CORS 錯誤
**問題**: 無法連接到 API，出現 CORS 錯誤
**解決**: 確保後端已正確設定 CORS 允許來源

### 相機權限
**問題**: 無法存取相機
**解決**: Hugging Face Space 提供 HTTPS，相機權限應該正常運作

### PWA 功能
**問題**: 無法安裝 PWA
**解決**: 確保 manifest.json 和 service worker 正確載入

## 📱 使用建議

1. **手機使用**: 建議在手機瀏覽器中開啟，體驗最佳
2. **安裝 PWA**: 可以將應用添加到手機主畫面
3. **離線功能**: 應用支援離線使用，網路恢復時會自動同步

## 🔒 安全注意事項

- 應用使用 JWT Token 進行身份驗證
- 所有 API 通訊都透過 HTTPS
- 敏感資料僅存儲在本地，不會上傳到 Hugging Face

## 📞 技術支援

如果遇到部署問題，請檢查：
1. 後端 API 是否正常運作
2. CORS 設定是否正確
3. 瀏覽器控制台是否有錯誤訊息
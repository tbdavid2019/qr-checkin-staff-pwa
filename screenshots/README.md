# PWA Screenshots Guide

這個目錄用於存放 PWA 的螢幕截圖，用於 manifest.json 中的 `screenshots` 欄位。

## 必要的截圖檔案

1. **screenshot-mobile-1.png** (360x640) - 登入頁面
2. **screenshot-mobile-2.png** (360x640) - 主頁面/儀表板
3. **screenshot-mobile-3.png** (360x640) - QR 掃描頁面
4. **screenshot-mobile-4.png** (360x640) - 統計頁面
5. **screenshot-desktop-1.png** (1280x720) - 桌面版概覽

## 截圖要求

### 手機截圖 (360x640)
- 顯示主要功能
- 清晰的用戶界面
- 真實的使用情境
- PNG 格式

### 桌面截圖 (1280x720)
- 展示響應式設計
- 完整的功能概覽
- PNG 格式

## 如何生成截圖

### 方法 1: 瀏覽器開發者工具
1. 開啟 Chrome DevTools
2. 切換到手機模式 (Device Toggle)
3. 選擇適當的裝置尺寸
4. 截圖各個頁面

### 方法 2: 實際裝置
1. 在手機上開啟 PWA
2. 使用手機截圖功能
3. 裁剪至適當尺寸

### 方法 3: 截圖工具
- **Puppeteer**: 自動化截圖
- **Playwright**: 跨瀏覽器截圖
- **Browser Screenshot Extensions**

## manifest.json 配置

截圖會自動加入到 manifest.json：

```json
"screenshots": [
  {
    "src": "screenshots/screenshot-mobile-1.png",
    "sizes": "360x640",
    "type": "image/png",
    "form_factor": "narrow",
    "label": "登入頁面"
  },
  {
    "src": "screenshots/screenshot-desktop-1.png", 
    "sizes": "1280x720",
    "type": "image/png",
    "form_factor": "wide",
    "label": "桌面版概覽"
  }
]
```

## 最佳實踐

1. **內容真實性**: 使用真實的資料和內容
2. **功能展示**: 突出關鍵功能
3. **設計一致性**: 與實際應用保持一致
4. **清晰度**: 確保文字和圖標清晰可見
5. **多語言**: 如果支援多語言，提供不同語言的截圖

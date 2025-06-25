# PWA Icons Generation Guide

這個專案需要以下 PWA 圖示檔案：

## 必要的圖示檔案

1. **icon-72.png** (72x72) - 用於較小螢幕
2. **icon-96.png** (96x96) - Android 標準尺寸  
3. **icon-128.png** (128x128) - Chrome Web Store
4. **icon-144.png** (144x144) - Windows Tile
5. **icon-152.png** (152x152) - iOS Safari
6. **icon-192.png** (192x192) - Android Chrome
7. **icon-384.png** (384x384) - 高解析度
8. **icon-512.png** (512x512) - 最大尺寸

## 如何生成圖示

### 方法 1: 使用 ImageMagick（推薦）

```bash
# 安裝 ImageMagick
sudo yum install ImageMagick  # CentOS/RHEL
# 或
sudo apt-get install imagemagick  # Ubuntu/Debian

# 從 SVG 生成 PNG
convert icon-192.svg -resize 72x72 icon-72.png
convert icon-192.svg -resize 96x96 icon-96.png
convert icon-192.svg -resize 128x128 icon-128.png
convert icon-192.svg -resize 144x144 icon-144.png
convert icon-192.svg -resize 152x152 icon-152.png
convert icon-192.svg -resize 192x192 icon-192.png
convert icon-192.svg -resize 384x384 icon-384.png
convert icon-192.svg -resize 512x512 icon-512.png
```

### 方法 2: 使用線上工具

1. 訪問 [realfavicongenerator.net](https://realfavicongenerator.net/)
2. 上傳 `icon-192.svg`
3. 下載生成的圖示包
4. 將圖示檔案放入 `icons/` 目錄

### 方法 3: 使用設計工具

- **Figma**: 開啟 SVG，匯出為不同尺寸的 PNG
- **GIMP**: 開啟 SVG，調整大小並匯出
- **Photoshop**: 開啟 SVG，調整大小並匯出

## 設計說明

圖示設計包含：
- 藍色背景 (#2563eb)
- 白色 QR Code 圖案
- 黃色員工徽章圖示
- 圓角設計 (24px radius)

## 測試圖示

生成圖示後，請在以下情況測試：
1. 手機瀏覽器書籤
2. 安裝到主畫面
3. PWA 安裝提示
4. 應用程式切換器

## 注意事項

- 確保所有圖示都有相同的設計風格
- 在小尺寸時保持清晰度
- 符合各平台的設計指南

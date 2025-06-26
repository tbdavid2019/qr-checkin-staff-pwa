# QR Check-in Staff PWA

## 📱 項目概覽

這是 QR Check-in System 的員工端 PWA（Progressive Web App）應用，專為員工在手機端進行票券掃描簽到而設計。

## ✨ 主要功能

### 🔐 身份驗證
- 員工登入（用戶名/密碼或登入碼）
- JWT Token 管理
- 自動登入狀態維護

### 📋 活動管理
- 查看可存取的活動列表
- 選擇當前工作活動
- 離線下載活動票券資料
- 活動統計資訊顯示

### 📷 QR 掃描簽到
- 相機 QR Code 掃描
- 即時票券資訊顯示
- 簽到確認/取消
- 離線簽到記錄

### 📊 統計功能
- 已掃描票券列表
- 未掃描票券列表
- 簽到統計報告
- 實時資料更新

### 🔄 離線支援
- 強大的離線運作能力
- 自動同步機制（每10-15分鐘）
- 網路恢復時自動上傳
- 本地資料持久化

## 🏗️ 技術架構

### 前端技術
- **HTML5**: 語意化標記和 PWA manifest
- **CSS3**: 響應式設計和現代化 UI
- **Vanilla JavaScript**: 純 JS 實現，高效能
- **Service Worker**: 離線快取和背景同步
- **IndexedDB**: 大量資料本地存儲
- **Camera API**: QR Code 掃描功能

### PWA 特性
- **可安裝**: 可添加到手機主畫面
- **離線優先**: 完整的離線運作能力
- **響應式**: 適配各種螢幕尺寸
- **快速載入**: Service Worker 快取策略
- **背景同步**: 網路恢復時自動同步

### 資料管理
```javascript
// LocalStorage 結構
{
  // 基本資訊
  authToken: "JWT_TOKEN",
  staffInfo: { id, name, permissions },
  
  // 活動資料
  events: [], // 員工可見的活動列表
  selectedEvent: {}, // 當前選中的活動
  
  // 票券資料（IndexedDB）
  tickets: [], // 當前活動的所有票券 (1000張)
  
  // 簽到記錄
  checkins: [], // 離線簽到記錄
  syncQueue: [], // 待同步的操作
  
  // 設定
  settings: {
    autoSync: true,
    syncInterval: 10 * 60 * 1000, // 10分鐘
    offlineMode: false
  }
}
```

## 📱 用戶流程

```
登入 → 選擇活動 → 下載票券資料 → 掃碼簽到 → 自動同步
```

### 詳細流程
1. **登入**: 員工輸入認證資訊
2. **選活動**: 從可存取的活動中選擇
3. **下載資料**: 同步活動的所有票券到本地
4. **掃碼簽到**: 使用相機掃描 QR Code
5. **確認簽到**: 顯示票券資訊並確認
6. **記錄本地**: 離線儲存簽到記錄
7. **自動同步**: 定期或網路恢復時上傳

## 🎯 效能目標

- **資料量**: 支援 1000張票券/活動
- **並發**: 5個員工同時操作
- **網路**: 適應不穩定網路環境
- **響應**: 掃描到確認 < 2秒
- **同步**: 離線記錄 100% 不遺失

## 📂 項目結構

```
qr-checkin-staff-pwa/
├── index.html              # 主頁面
├── manifest.json           # PWA 配置
├── sw.js                   # Service Worker
├── css/
│   ├── main.css           # 主樣式
│   ├── login.css          # 登入頁樣式
│   ├── scanner.css        # 掃描頁樣式
│   └── stats.css          # 統計頁樣式
├── js/
│   ├── app.js             # 主應用邏輯
│   ├── auth.js            # 認證管理
│   ├── api.js             # API 通訊
│   ├── storage.js         # 資料存儲
│   ├── scanner.js         # QR 掃描
│   ├── sync.js            # 同步機制
│   └── utils.js           # 工具函數
├── icons/                  # PWA 圖示
├── libs/                   # 第三方庫
│   └── qr-scanner.js      # QR 掃描庫
└── README.md              # 項目說明
```

## 🚀 快速開始

### 安裝與部署
```bash
# 克隆項目
cd /home/ec2-user/qr-checkin-staff-pwa

# 本地開發服務器
python3 -m http.server 8001

# 訪問應用
# http://localhost:8001
```

### 配置 API 端點
編輯 `js/api.js` 設定後端 API 地址：
```javascript
const API_BASE_URL = 'http://office.fanpokka.ai:8000';
```

## 🔧 開發指南

### API 整合
主要使用的 API 端點：
- `POST /api/v1/staff/login` - 員工登入
- `GET /api/v1/staff/me/events` - 獲取員工活動
- `POST /api/v1/staff/checkin/` - 票券簽到
- `POST /api/v1/staff/checkin/sync` - 離線同步

### 離線策略
1. **資料預載**: 登入後下載所有必要資料
2. **本地優先**: 優先使用本地快取資料
3. **背景同步**: 定期嘗試與服務器同步
4. **衝突解決**: 服務器資料優先策略

### 測試建議
- **功能測試**: 各個頁面和功能完整性
- **離線測試**: 斷網情況下的應用行為
- **同步測試**: 網路恢復後的資料同步
- **效能測試**: 大量資料載入和處理

## 🔒 安全考量

- **Token 管理**: JWT Token 安全存儲和自動更新
- **資料加密**: 敏感資料本地加密存儲
- **網路安全**: HTTPS 通訊和 CSP 設定
- **權限控制**: 僅存取員工授權的活動資料

## 📊 監控與分析

- **使用統計**: 掃描次數、成功率統計
- **錯誤追蹤**: 離線錯誤和同步失敗記錄
- **效能監控**: 載入時間和響應速度
- **網路狀態**: 線上/離線狀態追蹤

---

*此項目專為 QR Check-in System 員工端掃描簽到而設計* 🎯

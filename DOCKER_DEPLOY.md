# QR Check-in Staff PWA - Docker 部署說明（開發/測試環境）

> ⚠️ **注意**：這是開發/測試環境的部署方式
> 
> - **生產環境**（有獨立 80/443 port + SSL）請使用：`PRODUCTION_DEPLOY.md`
> - **開發/測試環境**（使用 8001 port）請使用此文檔

## 📋 前提條件

- Docker 已安裝
- Docker Compose 已安裝（推薦）
- 確認 port 8001 可用
- **不需要** SSL 證書（開發用途）

## 🚀 快速部署

### 方法 1：使用部署腳本（推薦）
```bash
# 使用預設 API endpoint (http://localhost:8000)
./deploy-docker.sh

# 指定自訂 API endpoint
./deploy-docker.sh http://your-api-server.com:8000

# 使用 HTTPS API
./deploy-docker.sh https://api.example.com

# 查看幫助
./deploy-docker.sh --help
```

### 方法 2：使用 Docker Compose
```bash
# 建置並啟動
docker-compose up -d

# 檢查狀態
docker-compose ps

# 檢視日誌
docker-compose logs -f
```

### 方法 3：純 Docker 命令
```bash
# 建置映像
docker build -t qr-checkin-staff-pwa .

# 啟動容器（可以指定不同的 API endpoint）
docker run -d \
  --name qr-staff-pwa \
  -p 8001:8001 \
  --restart unless-stopped \
  qr-checkin-staff-pwa

# 注意：API endpoint 會在建置時寫入到 js/api.js 中
```

## 🌐 服務存取

- **本地存取**: http://localhost:8001
- **健康檢查**: http://localhost:8001/health
- **說明**: 這是開發/測試環境，前端直接連接到您的 API 服務

> 🔗 **API 連接**：前端會直接連接到 `http://localhost:8000`（您的後端 API）

## 🔧 設定說明

### 環境類型
- **用途**: 開發/測試環境
- **SSL**: 不需要（使用 HTTP）
- **代理**: 不使用（前端直連 API）

### 端口設定
- 容器內：8001
- 主機：8001
- API 服務：8000（需要您另外啟動）

## 🚀 生產環境部署

如果您要部署到生產環境（有獨立 80/443 port），請使用：

```bash
# 查看生產環境部署指南
cat PRODUCTION_DEPLOY.md

# 一鍵生產環境部署
./deploy-production.sh your-domain.com admin@your-domain.com
```
- 主機：8001
- API 服務：8000（需要您另外啟動）

### API 連接方式
- **直接連接**：前端直接連接到您指定的 API endpoint
- **無代理**：不使用 nginx 代理，簡化開發環境
- **動態配置**：可在部署時指定不同的 API endpoint

### 指定 API Endpoint
```bash
# 本機 API（預設）
./deploy-docker.sh http://localhost:8000

# 遠端 API 服務器
./deploy-docker.sh http://192.168.1.100:8000

# HTTPS API
./deploy-docker.sh https://api.your-domain.com

# 不同 port 的 API
./deploy-docker.sh http://localhost:3000
```

## 🛠️ 管理命令

### 檢查狀態
```bash
# Docker Compose
docker-compose ps

# 純 Docker
docker ps --filter "name=qr-staff-pwa"
```

### 檢視日誌
```bash
# Docker Compose
docker-compose logs -f

# 純 Docker
docker logs -f qr-staff-pwa
```

### 重啟服務
```bash
# Docker Compose
docker-compose restart

# 純 Docker
docker restart qr-staff-pwa
```

### 停止服務
```bash
# Docker Compose
docker-compose down

# 純 Docker
docker stop qr-staff-pwa
docker rm qr-staff-pwa
```

### 更新部署
```bash
# 停止現有服務
docker-compose down

# 重新建置
docker-compose build

# 啟動服務
docker-compose up -d
```

## 🌐 Cloudflare Worker 設定

在 Cloudflare Worker 中設定 HTTPS 代理：

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 將 HTTPS 請求代理到 HTTP
    const targetUrl = `http://your-server-ip:8001${url.pathname}${url.search}`;
    
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    
    return response;
  },
};
```

## 🔍 故障排除

### 容器無法啟動
```bash
# 檢查容器日誌
docker logs qr-staff-pwa

# 檢查 nginx 配置
docker exec qr-staff-pwa nginx -t
```

### API 連線問題
```bash
# 測試 API 連線
curl http://localhost:8001/api/health

# 檢查 office.fanpokka.ai:8000 是否可達
curl http://office.fanpokka.ai:8000/health
```

### 端口被佔用
```bash
# 檢查端口使用情況
netstat -tulpn | grep 8001

# 使用不同端口
docker run -p 8002:8001 ...
```

## 📊 監控

### 健康檢查
```bash
curl http://localhost:8001/health
```

### 資源使用情況
```bash
docker stats qr-staff-pwa
```

## 🔐 安全注意事項

1. **防火牆設定**：確保只有 Cloudflare 可以存取 8001 端口
2. **API 安全**：所有 API 請求會透過代理，保護後端服務
3. **HTTPS 終止**：由 Cloudflare Worker 處理 HTTPS

## 🚨 緊急情況

### 緊急停止
```bash
docker stop qr-staff-pwa
```

### 完全重置
```bash
docker-compose down
docker system prune -f
./deploy-docker.sh
```

# QR Check-in Staff PWA - 生產環境部署指南

## 🚀 快速部署

### 1. 一鍵部署（推薦）
```bash
# 替換成您的域名和郵箱
./deploy-production.sh your-domain.com admin@your-domain.com
```

### 2. 手動部署步驟

#### 步驟 1: 準備環境
```bash
# 確保 Docker 和 Docker Compose 已安裝
docker --version
docker-compose --version

# 建立必要目錄
mkdir -p certbot/conf certbot/www logs
```

#### 步驟 2: 修改配置
```bash
# 在 production-nginx.conf 中替換域名
sed -i 's/your-domain.com/actual-domain.com/g' production-nginx.conf
```

#### 步驟 3: 獲取 SSL 證書
```bash
# 方法 1: 使用 SSL 管理腳本
./ssl-manager.sh your-domain.com admin@your-domain.com get

# 方法 2: 手動獲取
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@your-domain.com \
  --agree-tos \
  --no-eff-email \
  -d your-domain.com \
  -d www.your-domain.com
```

#### 步驟 4: 啟動服務
```bash
# 建置並啟動
DOMAIN=your-domain.com docker-compose -f docker-compose.production.yml up -d
```

## 🔧 管理命令

### 服務管理
```bash
# 檢查狀態
docker-compose -f docker-compose.production.yml ps

# 查看日誌
docker-compose -f docker-compose.production.yml logs -f

# 重啟服務
docker-compose -f docker-compose.production.yml restart

# 停止服務
docker-compose -f docker-compose.production.yml down

# 更新部署
docker-compose -f docker-compose.production.yml down
docker build -f Dockerfile.production -t qr-checkin-staff-pwa:production .
docker-compose -f docker-compose.production.yml up -d
```

### SSL 證書管理
```bash
# 更新證書
./ssl-manager.sh your-domain.com admin@your-domain.com renew

# 檢查證書狀態
./ssl-manager.sh your-domain.com '' check

# 撤銷證書
./ssl-manager.sh your-domain.com '' revoke

# 手動更新證書
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot renew --quiet

# 重載 nginx
docker-compose -f docker-compose.production.yml exec qr-checkin-staff nginx -s reload
```

### 自動化證書更新
```bash
# 編輯 crontab
crontab -e

# 添加以下行（每天中午 12 點檢查證書更新）
0 12 * * * cd /path/to/qr-checkin-staff-pwa && ./ssl-manager.sh your-domain.com admin@your-domain.com renew
```

## 🌐 服務存取

- **HTTPS**: https://your-domain.com
- **HTTP**: http://your-domain.com（自動重導向到 HTTPS）
- **健康檢查**: https://your-domain.com/health

## 📁 目錄結構

```
qr-checkin-staff-pwa/
├── Dockerfile.production          # 生產環境 Dockerfile
├── docker-compose.production.yml  # 生產環境 Docker Compose
├── production-nginx.conf          # 生產環境 nginx 配置
├── deploy-production.sh           # 一鍵部署腳本
├── ssl-manager.sh                 # SSL 證書管理腳本
├── certbot/                       # SSL 證書存放
│   ├── conf/                     # Let's Encrypt 配置
│   └── www/                      # ACME challenge 目錄
└── logs/                          # nginx 日誌
```

## 🔐 安全配置

### SSL/TLS 配置
- 支援 TLS 1.2 和 1.3
- 現代密碼套件
- HSTS 啟用
- 自動 HTTP 到 HTTPS 重導向

### 安全標頭
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Strict-Transport-Security

### PWA 支援
- Service Worker 正確快取策略
- Manifest 檔案優化
- Cross-Origin-Embedder-Policy
- Cross-Origin-Opener-Policy

## 🔍 故障排除

### 檢查服務狀態
```bash
# 檢查容器狀態
docker ps

# 檢查 nginx 配置
docker exec qr-checkin-staff-prod nginx -t

# 檢查 SSL 證書
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

### 常見問題

#### 1. SSL 證書獲取失敗
```bash
# 檢查域名 DNS 是否正確指向伺服器
nslookup your-domain.com

# 檢查 80 端口是否開放
curl -I http://your-domain.com/.well-known/acme-challenge/test
```

#### 2. nginx 配置錯誤
```bash
# 測試 nginx 配置
docker exec qr-checkin-staff-prod nginx -t

# 重載配置
docker exec qr-checkin-staff-prod nginx -s reload
```

#### 3. 端口被佔用
```bash
# 檢查端口使用情況
netstat -tulpn | grep :80
netstat -tulpn | grep :443

# 停止占用端口的服務
sudo systemctl stop apache2  # 如果有 Apache
sudo systemctl stop nginx    # 如果有系統 nginx
```

## 📊 監控與維護

### 健康檢查
```bash
# 檢查服務健康狀態
curl -f https://your-domain.com/health

# 檢查 SSL 證書有效期
./ssl-manager.sh your-domain.com '' check
```

### 日誌監控
```bash
# 即時日誌
docker-compose -f docker-compose.production.yml logs -f

# nginx 存取日誌
tail -f logs/access.log

# nginx 錯誤日誌
tail -f logs/error.log
```

### 資源監控
```bash
# 檢查容器資源使用情況
docker stats qr-checkin-staff-prod

# 檢查磁碟使用情況
df -h
```

## 🚨 備份與恢復

### 備份 SSL 證書
```bash
# 備份證書
tar -czf ssl-backup-$(date +%Y%m%d).tar.gz certbot/

# 恢復證書
tar -xzf ssl-backup-YYYYMMDD.tar.gz
```

### 完整備份
```bash
# 備份整個應用
tar -czf qr-checkin-backup-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  .
```

## 📞 支援

如果遇到問題，請檢查：
1. 域名 DNS 設定是否正確
2. 防火牆是否開放 80 和 443 端口
3. Docker 服務是否正常運行
4. SSL 證書是否在有效期內

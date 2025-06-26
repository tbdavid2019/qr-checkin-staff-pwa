#!/bin/bash

# QR Check-in Staff PWA - 生產環境部署腳本
set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 輸出函數
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查必要參數
if [ -z "$1" ]; then
    print_error "請提供域名參數"
    echo "使用方法: $0 <your-domain.com> [email@example.com]"
    exit 1
fi

DOMAIN="$1"
EMAIL="${2:-admin@${DOMAIN}}"

print_status "開始部署 QR Check-in Staff PWA 到生產環境"
print_status "域名: $DOMAIN"
print_status "郵箱: $EMAIL"

# 檢查 Docker 是否安裝
if ! command -v docker &> /dev/null; then
    print_error "Docker 未安裝，請先安裝 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose 未安裝，請先安裝 Docker Compose"
    exit 1
fi

# 更新 nginx 配置中的域名
print_status "更新 nginx 配置..."
sed -i "s/your-domain.com/$DOMAIN/g" production-nginx.conf

# 建立必要目錄
print_status "建立必要目錄..."
mkdir -p certbot/conf
mkdir -p certbot/www
mkdir -p logs

# 停止現有服務
print_status "停止現有服務..."
docker-compose -f docker-compose.production.yml down 2>/dev/null || true

# 建置 Docker 映像
print_status "建置 Docker 映像..."
docker build -f Dockerfile.production -t qr-checkin-staff-pwa:production .

# 啟動服務（僅 HTTP，用於獲取 SSL 證書）
print_status "啟動臨時 HTTP 服務..."
docker run -d \
    --name qr-checkin-temp \
    -p 80:80 \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    --rm \
    qr-checkin-staff-pwa:production

# 等待服務啟動
sleep 5

# 獲取 SSL 證書
print_status "獲取 SSL 證書..."
docker run --rm \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

# 停止臨時服務
print_status "停止臨時服務..."
docker stop qr-checkin-temp

# 啟動完整服務（HTTP + HTTPS）
print_status "啟動完整服務..."
DOMAIN="$DOMAIN" docker-compose -f docker-compose.production.yml up -d

# 等待服務完全啟動
print_status "等待服務啟動..."
sleep 10

# 驗證部署
print_status "驗證部署..."
if curl -f -s "https://$DOMAIN/health" > /dev/null; then
    print_status "✅ HTTPS 服務正常運行"
else
    print_warning "HTTPS 服務可能尚未完全啟動，請稍後再試"
fi

if curl -f -s "http://$DOMAIN/health" > /dev/null; then
    print_status "✅ HTTP 重導向正常"
else
    print_warning "HTTP 服務可能有問題"
fi

# 設定 SSL 證書自動更新
print_status "設定 SSL 證書自動更新..."
cat > renew-ssl.sh << EOF
#!/bin/bash
# SSL 證書自動更新腳本
docker run --rm \\
    -v "\$(pwd)/certbot/conf:/etc/letsencrypt" \\
    -v "\$(pwd)/certbot/www:/var/www/certbot" \\
    certbot/certbot renew --quiet

# 重載 nginx
docker-compose -f docker-compose.production.yml exec qr-checkin-staff nginx -s reload
EOF

chmod +x renew-ssl.sh

print_status "部署完成！"
echo ""
echo "🌐 服務地址:"
echo "   - HTTPS: https://$DOMAIN"
echo "   - HTTP: http://$DOMAIN (自動重導向到 HTTPS)"
echo ""
echo "🔧 管理命令:"
echo "   - 檢查狀態: docker-compose -f docker-compose.production.yml ps"
echo "   - 查看日誌: docker-compose -f docker-compose.production.yml logs -f"
echo "   - 重啟服務: docker-compose -f docker-compose.production.yml restart"
echo "   - 更新 SSL: ./renew-ssl.sh"
echo ""
echo "📅 別忘了設定 crontab 自動更新 SSL 證書:"
echo "   0 12 * * * cd $(pwd) && ./renew-ssl.sh"

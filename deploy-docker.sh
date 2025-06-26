#!/bin/bash

# QR Check-in Staff PWA Docker 建置和部署腳本

set -e

# 預設配置
PWA_DIR="/home/ec2-user/qr-checkin-staff-pwa"
IMAGE_NAME="qr-checkin-staff-pwa"
CONTAINER_NAME="qr-staff-pwa"
PORT="8001"
DEFAULT_API_ENDPOINT="http://localhost:8000"

# 從參數獲取 API endpoint
API_ENDPOINT="${1:-$DEFAULT_API_ENDPOINT}"

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 顯示使用說明
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "QR Check-in Staff PWA - Docker 部署腳本"
    echo ""
    echo "使用方法:"
    echo "  $0 [API_ENDPOINT]"
    echo ""
    echo "參數:"
    echo "  API_ENDPOINT    後端 API 地址 (預設: $DEFAULT_API_ENDPOINT)"
    echo ""
    echo "範例:"
    echo "  $0                                    # 使用預設 API endpoint"
    echo "  $0 http://localhost:8000              # 指定本機 API"
    echo "  $0 http://your-api-server.com:8000    # 指定遠端 API"
    echo "  $0 https://api.example.com            # 指定 HTTPS API"
    exit 0
fi

echo "=== QR Check-in Staff PWA Docker 部署 ==="
echo "目錄: $PWA_DIR"
echo "映像名稱: $IMAGE_NAME"
echo "容器名稱: $CONTAINER_NAME"
echo "埠號: $PORT"
echo "API Endpoint: $API_ENDPOINT"
echo ""

# 切換到專案目錄
cd "$PWA_DIR"

# 更新 API 配置
print_status "更新 API 配置到 $API_ENDPOINT..."
sed -i "s|this\.baseURL = '[^']*'|this.baseURL = '$API_ENDPOINT'|g" js/api.js

# 檢查 Docker 是否安裝
if ! command -v docker >/dev/null 2>&1; then
    print_error "Docker 未安裝，請先安裝 Docker"
    exit 1
fi

# 檢查 Docker Compose 是否安裝
if ! command -v docker-compose >/dev/null 2>&1; then
    print_warning "Docker Compose 未安裝，將使用純 Docker 命令"
    USE_COMPOSE=false
else
    USE_COMPOSE=true
fi

print_status "停止並移除現有容器..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

print_status "建置 Docker 映像..."
docker build -t "$IMAGE_NAME" .

if [ "$USE_COMPOSE" = true ]; then
    print_status "使用 Docker Compose 啟動服務..."
    COMPOSE_API_ENDPOINT="$API_ENDPOINT" docker-compose up -d
else
    print_status "使用 Docker 啟動容器..."
    docker run -d \
        --name "$CONTAINER_NAME" \
        -p "$PORT:$PORT" \
        --restart unless-stopped \
        "$IMAGE_NAME"
fi

echo ""
print_status "等待服務啟動..."
sleep 5

# 健康檢查
print_status "檢查服務狀態..."
if curl -f "http://localhost:$PORT/health" >/dev/null 2>&1; then
    print_status "✅ 服務啟動成功！"
    echo ""
    echo "🌐 服務 URLs:"
    echo "   - 本地存取: http://localhost:$PORT"
    echo "   - 健康檢查: http://localhost:$PORT/health"
    echo "   - API 連接: $API_ENDPOINT"
    echo ""
    echo "📊 容器狀態:"
    if [ "$USE_COMPOSE" = true ]; then
        docker-compose ps
    else
        docker ps --filter "name=$CONTAINER_NAME"
    fi
    echo ""
    echo "📝 檢視日誌:"
    if [ "$USE_COMPOSE" = true ]; then
        echo "   docker-compose logs -f"
    else
        echo "   docker logs -f $CONTAINER_NAME"
    fi
else
    print_error "服務啟動失敗，請檢查日誌"
    if [ "$USE_COMPOSE" = true ]; then
        docker-compose logs
    else
        docker logs "$CONTAINER_NAME"
    fi
    exit 1
fi

echo ""
print_status "🎉 部署完成！"
echo ""
echo "💡 下一步："
echo "1. 確保後端 API 服務在 $API_ENDPOINT 正常運行"
echo "2. 測試 PWA 功能是否正常"
echo "3. 檢查前端與 API 的連線"
if [[ "$API_ENDPOINT" != http* ]]; then
    print_warning "API endpoint 可能需要完整的 URL（包含 http:// 或 https://）"
fi

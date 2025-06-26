#!/bin/bash

# Cloudflare Worker 測試腳本

echo "=== Cloudflare Worker 連線測試 ==="
echo ""

WORKER_URL="https://your-worker-domain.workers.dev"  # 請替換為你的 Worker 網址
TARGET_URL="http://office.fanpokka.ai:8001"

echo "1. 測試直接連線到目標伺服器..."
echo "URL: $TARGET_URL/health"
curl -v -H "Accept: application/json" "$TARGET_URL/health" 2>&1 | head -20
echo ""

echo "2. 測試透過 Cloudflare Worker 連線..."
echo "URL: $WORKER_URL/health"
# curl -v -H "Accept: application/json" "$WORKER_URL/health" 2>&1 | head -20
echo "(請替換 WORKER_URL 並取消註解上一行)"
echo ""

echo "3. 測試 CORS 預檢請求..."
echo "OPTIONS $WORKER_URL/api/health"
# curl -v -X OPTIONS \
#   -H "Origin: https://your-pwa-domain.com" \
#   -H "Access-Control-Request-Method: GET" \
#   -H "Access-Control-Request-Headers: Content-Type" \
#   "$WORKER_URL/api/health"
echo "(請替換 URL 並取消註解上面的 curl 命令)"
echo ""

echo "💡 測試建議："
echo "1. 先確認 office.fanpokka.ai:8001 可以直接存取"
echo "2. 檢查 Cloudflare Worker 的設定"
echo "3. 測試 CORS 是否正常運作"
echo "4. 檢查瀏覽器開發者工具的網路標籤"

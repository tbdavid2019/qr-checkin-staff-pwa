#!/bin/bash

# QR Check-in Staff PWA - 本地測試伺服器

PORT=${1:-8080}
PWA_DIR="/home/ec2-user/qr-checkin-staff-pwa"

echo "=== QR Check-in Staff PWA 本地測試伺服器 ==="
echo "目錄: $PWA_DIR"
echo "埠號: $PORT"
echo ""

# 檢查目錄是否存在
if [ ! -d "$PWA_DIR" ]; then
    echo "錯誤: PWA 目錄不存在: $PWA_DIR"
    exit 1
fi

# 切換到 PWA 目錄
cd "$PWA_DIR"

# 檢查是否有 Python
if command -v python3 >/dev/null 2>&1; then
    echo "使用 Python 3 HTTP 伺服器..."
    echo "URL: http://localhost:$PORT"
    echo "測試頁面: http://localhost:$PORT/test.html"
    echo ""
    echo "按 Ctrl+C 停止伺服器"
    echo ""
    python3 -m http.server $PORT
elif command -v python >/dev/null 2>&1; then
    echo "使用 Python 2 HTTP 伺服器..."
    echo "URL: http://localhost:$PORT"
    echo "測試頁面: http://localhost:$PORT/test.html"
    echo ""
    echo "按 Ctrl+C 停止伺服器"
    echo ""
    python -m SimpleHTTPServer $PORT
elif command -v node >/dev/null 2>&1; then
    echo "使用 Node.js http-server..."
    
    # 檢查是否安裝了 http-server
    if ! command -v http-server >/dev/null 2>&1; then
        echo "安裝 http-server..."
        npm install -g http-server
    fi
    
    echo "URL: http://localhost:$PORT"
    echo "測試頁面: http://localhost:$PORT/test.html"
    echo ""
    echo "按 Ctrl+C 停止伺服器"
    echo ""
    http-server -p $PORT
else
    echo "錯誤: 找不到 Python 或 Node.js"
    echo "請安裝以下任一項目："
    echo "- Python 3: yum install python3"
    echo "- Python 2: yum install python"
    echo "- Node.js: 請參考官方安裝指南"
    exit 1
fi

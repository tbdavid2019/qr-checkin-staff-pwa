#!/bin/bash

# QR Check-in Staff PWA - 專案完整性檢查

PWA_DIR="/home/ec2-user/qr-checkin-staff-pwa"
PASS="✅"
FAIL="❌"
WARN="⚠️"

echo "=== QR Check-in Staff PWA 專案完整性檢查 ==="
echo ""

# 切換到專案目錄
cd "$PWA_DIR" || exit 1

echo "📁 檔案完整性檢查"
echo "==================="

# 檢查核心檔案
files=(
    "index.html:核心 HTML 檔案"
    "manifest.json:PWA 配置"
    "sw.js:Service Worker"
    "test.html:測試頁面"
)

for file_info in "${files[@]}"; do
    file="${file_info%%:*}"
    desc="${file_info#*:}"
    if [[ -f "$file" ]]; then
        echo "$PASS $desc ($file)"
    else
        echo "$FAIL $desc ($file) - 檔案缺失"
    fi
done

echo ""
echo "🎨 CSS 樣式檔案"
echo "================"

css_files=(
    "css/main.css:主要樣式"
    "css/login.css:登入頁面樣式"
    "css/scanner.css:掃描頁面樣式"
    "css/stats.css:統計頁面樣式"
)

for file_info in "${css_files[@]}"; do
    file="${file_info%%:*}"
    desc="${file_info#*:}"
    if [[ -f "$file" ]]; then
        echo "$PASS $desc ($file)"
    else
        echo "$FAIL $desc ($file) - 檔案缺失"
    fi
done

echo ""
echo "📜 JavaScript 模組"
echo "=================="

js_files=(
    "js/utils.js:工具函數"
    "js/storage.js:本地儲存"
    "js/api.js:API 通信"
    "js/auth.js:身份驗證"
    "js/sync.js:離線同步"
    "js/scanner.js:QR 掃描"
    "js/stats.js:統計功能"
    "js/app.js:主應用程式"
)

for file_info in "${js_files[@]}"; do
    file="${file_info%%:*}"
    desc="${file_info#*:}"
    if [[ -f "$file" ]]; then
        echo "$PASS $desc ($file)"
    else
        echo "$FAIL $desc ($file) - 檔案缺失"
    fi
done

echo ""
echo "📚 第三方庫"
echo "==========="

lib_files=(
    "libs/qr-scanner.min.js:QR 掃描庫"
    "libs/qr-scanner-worker.min.js:QR 掃描 Worker"
)

for file_info in "${lib_files[@]}"; do
    file="${file_info%%:*}"
    desc="${file_info#*:}"
    if [[ -f "$file" ]]; then
        echo "$PASS $desc ($file)"
    else
        echo "$FAIL $desc ($file) - 檔案缺失"
    fi
done

echo ""
echo "🖼️ 資源檔案"
echo "==========="

# 檢查目錄
if [[ -d "icons" ]]; then
    echo "$PASS icons/ 目錄存在"
    if [[ -f "icons/icon-192.svg" ]]; then
        echo "$PASS SVG 圖示 (icons/icon-192.svg)"
    else
        echo "$WARN SVG 圖示缺失 - 需要手動建立 PNG 圖示"
    fi
else
    echo "$FAIL icons/ 目錄缺失"
fi

if [[ -d "screenshots" ]]; then
    echo "$PASS screenshots/ 目錄存在"
    echo "$WARN PWA 截圖需要手動建立"
else
    echo "$FAIL screenshots/ 目錄缺失"
fi

echo ""
echo "📖 文檔檔案"
echo "==========="

doc_files=(
    "README.md:專案說明"
    "DEPLOYMENT_CHECKLIST.md:部署檢查清單"
    "start-server.sh:本地測試伺服器"
)

for file_info in "${doc_files[@]}"; do
    file="${file_info%%:*}"
    desc="${file_info#*:}"
    if [[ -f "$file" ]]; then
        echo "$PASS $desc ($file)"
    else
        echo "$FAIL $desc ($file) - 檔案缺失"
    fi
done

echo ""
echo "🔍 檔案語法檢查"
echo "================"

# 檢查 JSON 檔案語法
if command -v python3 >/dev/null; then
    for json_file in manifest.json; do
        if python3 -m json.tool "$json_file" >/dev/null 2>&1; then
            echo "$PASS $json_file 語法正確"
        else
            echo "$FAIL $json_file 語法錯誤"
        fi
    done
else
    echo "$WARN 無法檢查 JSON 語法 (需要 Python)"
fi

# 檢查 HTML 檔案
html_files=(index.html test.html)
for html_file in "${html_files[@]}"; do
    if [[ -f "$html_file" ]]; then
        # 簡單檢查 HTML 結構
        if grep -q "<!DOCTYPE html>" "$html_file" && grep -q "</html>" "$html_file"; then
            echo "$PASS $html_file 基本結構正確"
        else
            echo "$WARN $html_file 結構可能有問題"
        fi
    fi
done

echo ""
echo "📊 統計資訊"
echo "==========="

total_files=$(find . -type f | wc -l)
js_count=$(find . -name "*.js" | wc -l)
css_count=$(find . -name "*.css" | wc -l)
html_count=$(find . -name "*.html" | wc -l)

echo "總檔案數: $total_files"
echo "JavaScript 檔案: $js_count"
echo "CSS 檔案: $css_count"
echo "HTML 檔案: $html_count"

echo ""
echo "🚀 下一步"
echo "========="
echo "1. 執行本地測試: ./start-server.sh"
echo "2. 開啟瀏覽器測試: http://localhost:8080"
echo "3. 執行模組測試: http://localhost:8080/test.html"
echo "4. 檢查 PWA 功能: Chrome DevTools > Application"
echo "5. 建立 PNG 圖示: 參考 icons/README.md"
echo "6. 建立 PWA 截圖: 參考 screenshots/README.md"
echo ""
echo "檢查完成！"

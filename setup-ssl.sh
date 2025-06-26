#!/bin/bash
# SSL 憑證自動化安裝腳本
# 使用 Certbot 和 Let's Encrypt

set -e

# 配置變數 - 請修改這些值
DOMAIN="your-domain.com"
EMAIL="your-email@example.com"
WEBROOT="/var/www/html"
NGINX_CONFIG="/etc/nginx/sites-available/qr-checkin-staff"

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# 檢查是否為 root 用戶
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "此腳本需要 root 權限執行"
        print_status "請使用: sudo $0"
        exit 1
    fi
}

# 安裝必要套件
install_dependencies() {
    print_status "安裝必要套件..."
    
    # 更新套件列表
    apt update
    
    # 安裝 nginx 和 certbot
    apt install -y nginx certbot python3-certbot-nginx
    
    # 建立 webroot 目錄
    mkdir -p /var/www/certbot
    chown -R www-data:www-data /var/www/certbot
}

# 設定初始 nginx 配置（用於 ACME 挑戰）
setup_initial_nginx() {
    print_status "設定初始 nginx 配置..."
    
    cat > /etc/nginx/sites-available/qr-checkin-staff << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    root ${WEBROOT};
    index index.html;
    
    # Let's Encrypt ACME 挑戰
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files \$uri =404;
    }
    
    # 臨時允許所有存取（SSL 憑證取得前）
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
    
    # 啟用網站
    ln -sf /etc/nginx/sites-available/qr-checkin-staff /etc/nginx/sites-enabled/
    
    # 移除預設網站
    rm -f /etc/nginx/sites-enabled/default
    
    # 測試 nginx 配置
    nginx -t
    
    # 重載 nginx
    systemctl reload nginx
}

# 取得 SSL 憑證
obtain_ssl_certificate() {
    print_status "取得 SSL 憑證..."
    
    # 使用 webroot 模式取得憑證
    certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email ${EMAIL} \
        --agree-tos \
        --no-eff-email \
        --domains ${DOMAIN},www.${DOMAIN}
    
    if [ $? -eq 0 ]; then
        print_status "SSL 憑證取得成功！"
    else
        print_error "SSL 憑證取得失敗"
        exit 1
    fi
}

# 更新 nginx 配置以支援 HTTPS
update_nginx_ssl_config() {
    print_status "更新 nginx 配置以支援 HTTPS..."
    
    # 複製生產環境配置
    cp nginx-production.conf /etc/nginx/sites-available/qr-checkin-staff
    
    # 替換域名
    sed -i "s/your-domain.com/${DOMAIN}/g" /etc/nginx/sites-available/qr-checkin-staff
    
    # 測試配置
    nginx -t
    
    if [ $? -eq 0 ]; then
        print_status "nginx 配置測試通過"
        systemctl reload nginx
        print_status "nginx 已重新載入"
    else
        print_error "nginx 配置測試失敗"
        exit 1
    fi
}

# 設定自動更新
setup_auto_renewal() {
    print_status "設定 SSL 憑證自動更新..."
    
    # 建立更新腳本
    cat > /usr/local/bin/certbot-renewal.sh << 'EOF'
#!/bin/bash
# SSL 憑證自動更新腳本

# 嘗試更新憑證
certbot renew --pre-hook "systemctl stop nginx" --post-hook "systemctl start nginx"

# 檢查更新結果
if [ $? -eq 0 ]; then
    echo "$(date): SSL 憑證更新檢查完成"
else
    echo "$(date): SSL 憑證更新失敗" >&2
fi
EOF
    
    chmod +x /usr/local/bin/certbot-renewal.sh
    
    # 新增 crontab 任務（每日檢查）
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/certbot-renewal.sh >> /var/log/certbot-renewal.log 2>&1") | crontab -
    
    print_status "自動更新已設定（每日凌晨 2 點檢查）"
}

# 設定防火牆
setup_firewall() {
    print_status "設定防火牆..."
    
    if command -v ufw >/dev/null 2>&1; then
        # 允許 HTTP 和 HTTPS
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw allow ssh
        
        # 啟用防火牆（如果尚未啟用）
        ufw --force enable
        
        print_status "防火牆設定完成"
    else
        print_warning "未找到 ufw，請手動設定防火牆開放 port 80 和 443"
    fi
}

# 部署應用
deploy_application() {
    print_status "部署應用..."
    
    # 建立應用目錄
    mkdir -p ${WEBROOT}
    
    # 複製應用檔案（排除不需要的檔案）
    rsync -av --exclude='*.md' --exclude='docker*' --exclude='.git*' --exclude='*.sh' \
          ./ ${WEBROOT}/
    
    # 設定權限
    chown -R www-data:www-data ${WEBROOT}
    chmod -R 755 ${WEBROOT}
    
    print_status "應用部署完成"
}

# 驗證部署
verify_deployment() {
    print_status "驗證部署..."
    
    # 檢查 nginx 狀態
    if systemctl is-active --quiet nginx; then
        print_status "✓ nginx 正在運行"
    else
        print_error "✗ nginx 未運行"
        return 1
    fi
    
    # 檢查 SSL 憑證
    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        print_status "✓ SSL 憑證存在"
    else
        print_error "✗ SSL 憑證不存在"
        return 1
    fi
    
    # 檢查網站可訪問性
    if curl -f -s "http://${DOMAIN}/health" > /dev/null; then
        print_status "✓ HTTP 健康檢查通過"
    else
        print_warning "HTTP 健康檢查失敗"
    fi
    
    if curl -f -s "https://${DOMAIN}/health" > /dev/null; then
        print_status "✓ HTTPS 健康檢查通過"
    else
        print_warning "HTTPS 健康檢查失敗"
    fi
    
    print_status "部署驗證完成"
}

# 顯示結果資訊
show_summary() {
    echo
    echo "==============================================="
    echo "           SSL 部署完成！"
    echo "==============================================="
    echo
    echo "網站訪問地址："
    echo "  HTTP:  http://${DOMAIN}"
    echo "  HTTPS: https://${DOMAIN}"
    echo
    echo "重要檔案位置："
    echo "  應用目錄: ${WEBROOT}"
    echo "  nginx 配置: /etc/nginx/sites-available/qr-checkin-staff"
    echo "  SSL 憑證: /etc/letsencrypt/live/${DOMAIN}/"
    echo "  更新日誌: /var/log/certbot-renewal.log"
    echo
    echo "管理命令："
    echo "  檢查 nginx: systemctl status nginx"
    echo "  重載 nginx: systemctl reload nginx"
    echo "  檢查憑證: certbot certificates"
    echo "  手動更新: certbot renew"
    echo
    echo "注意事項："
    echo "  - SSL 憑證會自動更新（每日檢查）"
    echo "  - 防火牆已開放 port 80 和 443"
    echo "  - 所有 HTTP 請求會自動重定向到 HTTPS"
    echo
}

# 主執行流程
main() {
    echo "==============================================="
    echo "    QR Check-in Staff PWA - SSL 自動部署"
    echo "==============================================="
    echo
    
    # 檢查參數
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        echo "使用方法: $0 [域名] [郵箱]"
        echo "範例: $0 qr.example.com admin@example.com"
        exit 0
    fi
    
    # 允許通過參數指定域名和郵箱
    if [ ! -z "$1" ]; then
        DOMAIN="$1"
    fi
    
    if [ ! -z "$2" ]; then
        EMAIL="$2"
    fi
    
    # 確認配置
    echo "配置資訊："
    echo "  域名: ${DOMAIN}"
    echo "  郵箱: ${EMAIL}"
    echo "  網站目錄: ${WEBROOT}"
    echo
    
    if [ "${DOMAIN}" = "your-domain.com" ] || [ "${EMAIL}" = "your-email@example.com" ]; then
        print_error "請修改腳本中的 DOMAIN 和 EMAIL 變數，或通過參數提供"
        print_status "使用方法: $0 你的域名.com 你的郵箱@example.com"
        exit 1
    fi
    
    read -p "確認開始部署？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "部署已取消"
        exit 0
    fi
    
    # 執行部署步驟
    check_root
    install_dependencies
    deploy_application
    setup_initial_nginx
    obtain_ssl_certificate
    update_nginx_ssl_config
    setup_auto_renewal
    setup_firewall
    verify_deployment
    show_summary
}

# 執行主程式
main "$@"

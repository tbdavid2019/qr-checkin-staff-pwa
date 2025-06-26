#!/bin/bash

# SSL 證書管理腳本
set -e

DOMAIN="$1"
EMAIL="$2"
ACTION="${3:-renew}"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 獲取新證書
get_certificate() {
    if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
        print_error "請提供域名和郵箱"
        echo "使用方法: $0 <domain> <email> get"
        exit 1
    fi
    
    print_status "為 $DOMAIN 獲取 SSL 證書..."
    
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
}

# 更新證書
renew_certificate() {
    print_status "更新 SSL 證書..."
    
    docker run --rm \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        certbot/certbot renew --quiet
    
    print_status "重載 nginx..."
    docker-compose -f docker-compose.production.yml exec qr-checkin-staff nginx -s reload
}

# 檢查證書狀態
check_certificate() {
    if [ -z "$DOMAIN" ]; then
        print_error "請提供域名"
        echo "使用方法: $0 <domain> '' check"
        exit 1
    fi
    
    print_status "檢查 $DOMAIN 的證書狀態..."
    
    docker run --rm \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        certbot/certbot certificates
}

# 撤銷證書
revoke_certificate() {
    if [ -z "$DOMAIN" ]; then
        print_error "請提供域名"
        echo "使用方法: $0 <domain> '' revoke"
        exit 1
    fi
    
    print_status "撤銷 $DOMAIN 的證書..."
    
    docker run --rm \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        certbot/certbot revoke \
        --cert-path "/etc/letsencrypt/live/$DOMAIN/cert.pem"
}

case $ACTION in
    "get")
        get_certificate
        ;;
    "renew")
        renew_certificate
        ;;
    "check")
        check_certificate
        ;;
    "revoke")
        revoke_certificate
        ;;
    *)
        echo "使用方法: $0 <domain> <email> <action>"
        echo "Actions: get, renew, check, revoke"
        exit 1
        ;;
esac

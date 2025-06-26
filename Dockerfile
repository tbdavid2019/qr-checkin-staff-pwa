# QR Check-in Staff PWA Dockerfile
FROM nginx:alpine

# 安裝必要的工具
RUN apk add --no-cache curl

# 複製 PWA 檔案到 nginx 預設目錄
COPY . /usr/share/nginx/html/

# 複製 Docker 專用的 nginx 配置
COPY docker-nginx.conf /etc/nginx/conf.d/default.conf

# 移除預設的 nginx 配置
RUN rm -f /etc/nginx/conf.d/default.conf.bak

# 建立日誌目錄
RUN mkdir -p /var/log/nginx

# 設定權限
RUN chown -R nginx:nginx /usr/share/nginx/html
RUN chown -R nginx:nginx /var/log/nginx

# 暴露 8001 port
EXPOSE 8001

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/ || exit 1

# 啟動 nginx
CMD ["nginx", "-g", "daemon off;"]

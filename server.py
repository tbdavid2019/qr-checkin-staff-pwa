#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

# 設定目錄為當前腳本所在目錄
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = 8080

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 添加 PWA 必要的 headers
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def guess_type(self, path):
        # 確保正確的 MIME 類型
        mimetype = super().guess_type(path)
        if path.endswith('.js'):
            return 'application/javascript'
        elif path.endswith('.json'):
            return 'application/json'
        elif path.endswith('.css'):
            return 'text/css'
        return mimetype

print(f"正在啟動本地伺服器...")
print(f"URL: http://localhost:{PORT}")
print(f"目錄: {os.getcwd()}")
print("按 Ctrl+C 停止伺服器")

try:
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\n伺服器已停止")
    sys.exit(0)

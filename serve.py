#!/usr/bin/env python3
import http.server
import socketserver
import os
import mimetypes
import sys

# 設定目錄為當前腳本所在目錄
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = 8002

# 確保正確的 MIME 類型
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('image/svg+xml', '.svg')

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 添加 CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def guess_type(self, path):
        """Override to ensure correct MIME types"""
        mimetype, _ = mimetypes.guess_type(path)
        if path.endswith('.js'):
            return 'application/javascript'
        elif path.endswith('.json'):
            return 'application/json'
        elif path.endswith('.css'):
            return 'text/css'
        elif path.endswith('.svg'):
            return 'image/svg+xml'
        return mimetype or 'application/octet-stream'

print(f"正在啟動本地伺服器...")
print(f"URL: http://localhost:{PORT}")
print(f"目錄: {os.getcwd()}")
print("按 Ctrl+C 停止伺服器")

try:
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\n伺服器已停止")
    sys.exit(0)
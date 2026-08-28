#!/usr/bin/env python3
"""
Đoàn Thượng Badminton - Local Development & Test Server
Chạy lệnh: python server.py
Mở trình duyệt: http://localhost:8000
"""

import http.server
import socketserver
import os
import sys

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Tắt cache khi test cục bộ để cập nhật code tức thì
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == "__main__":
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("=" * 65)
        print("  🏸 ĐOÀN THƯỢNG BADMINTON - HỆ THỐNG XẾP HẠNG BWF TRỰC TUYẾN 🏸")
        print("=" * 65)
        print(f" Server đang chạy tại: http://localhost:{PORT}")
        print(" 2 Tài khoản Admin mặc định:")
        print("   1. nguyenducnhatminh  | Mật khẩu: minh226899@")
        print("   2. nguyenduchieu      | Mật khẩu: minh 226899@")
        print(" Nhấn Ctrl + C để dừng server.")
        print("=" * 65)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nĐã dừng server.")
            sys.exit(0)

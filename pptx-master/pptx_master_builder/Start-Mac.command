#!/bin/bash
# Khởi động PPTX Master Builder (Mac) — double-click để chạy.
cd "$(dirname "$0")" || exit 1

# kiểm tra python3
if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ Chưa cài Python 3. Tải tại: https://www.python.org/downloads/"
  read -r -p "Nhấn Enter để đóng..."
  exit 1
fi

# kiểm tra python-pptx, tự cài nếu thiếu
if ! python3 -c "import pptx" >/dev/null 2>&1; then
  echo "⏳ Đang cài thư viện python-pptx (lần đầu)..."
  python3 -m pip install --user python-pptx || {
    echo "❌ Cài python-pptx thất bại. Chạy tay: python3 -m pip install --user python-pptx"
    read -r -p "Nhấn Enter để đóng..."
    exit 1
  }
fi

echo "🚀 Đang khởi động PPTX Master Builder..."
python3 app.py

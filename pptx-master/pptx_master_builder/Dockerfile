# PPTX Master Builder — container image
# Preview slide dùng LibreOffice (soffice) vì server Linux không có qlmanage của macOS.
FROM python:3.11-slim

# libreoffice-impress: render pptx -> png cho preview (nhẹ hơn full libreoffice).
# fonts-dejavu: font cơ bản để render chữ không bị hộp trống.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libreoffice-impress \
        fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir python-pptx pillow

WORKDIR /app
COPY . /app

# Nghe mọi interface trong container; PORT có thể override qua env.
ENV HOST=0.0.0.0 \
    PORT=8765 \
    PYTHONUNBUFFERED=1

EXPOSE 8765

CMD ["python", "app.py"]

FROM python:3.12-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && playwright install --with-deps chromium

COPY app ./app

ENV PYTHONPATH=/app
ENV PORT=8200

EXPOSE 8200

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=30s \
  CMD wget -qO- http://127.0.0.1:8200/health | grep -q ok || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8200"]

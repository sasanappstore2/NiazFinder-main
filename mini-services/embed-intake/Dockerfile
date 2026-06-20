FROM python:3.12-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

ENV EMBED_MODEL_PATH=/models/EMBED/multilingual-e5-small.Q8_0.gguf
ENV EMBED_MODEL_ID=multilingual-e5-small
ENV EMBED_PORT=8101

EXPOSE 8101

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8101"]

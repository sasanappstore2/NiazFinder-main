FROM python:3.12-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

ENV MODEL_PATH=/models/GEMMA/gemma-4-E2B_q4_0-it.gguf
ENV NEED_INTAKE_LLM_MODEL=gemma-4-e2b-q4_0-it
ENV GEMMA4_HOST=0.0.0.0
ENV GEMMA4_PORT=8100

EXPOSE 8100

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8100"]

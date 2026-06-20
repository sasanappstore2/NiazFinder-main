# Local GGUF LLM Gateway (gemma4-intake)

OpenAI-compatible local inference for **`models/GEMMA/gemma-4-E2B_q4_0-it.gguf`** via [llama-cpp-python](https://github.com/abetlen/llama-cpp-python).

All site AI features (need intake, platform chat agent, estate-scrape) call this service on port **8100**.

## Setup

```bash
cd mini-services/gemma4-intake
python3.12 -m venv .venv
source .venv/bin/activate

# macOS Apple Silicon (Metal):
CMAKE_ARGS="-DGGML_METAL=on" pip install -r requirements.txt

# Linux CPU-only:
pip install -r requirements.txt
```

Place the model file at:

```
models/GEMMA/gemma-4-E2B_q4_0-it.gguf
```

## Run

```bash
MODEL_PATH=../../models/GEMMA/gemma-4-E2B_q4_0-it.gguf \
NEED_INTAKE_LLM_MODEL=gemma-4-e2b-q4_0-it \
uvicorn app.main:app --host 127.0.0.1 --port 8100
```

Or from repo root:

```bash
npm run dev:gemma4-intake
```

## Endpoints

- `GET /health` — includes `backend: "llama-cpp"`, `modelPath`, `modelId`
- `GET /v1/models`
- `POST /v1/chat/completions` (OpenAI-compatible)
- `POST /analyze` (worker-go async intake)

## Env

| Variable | Default |
|----------|---------|
| `MODEL_PATH` | `models/GEMMA/gemma-4-E2B_q4_0-it.gguf` |
| `NEED_INTAKE_LLM_MODEL` | `gemma-4-e2b-q4_0-it` |
| `GEMMA4_PORT` | `8100` |
| `GEMMA4_DEVICE` | `auto` (`cpu`, `mps`, `cuda`) |
| `LLAMA_N_CTX` | `8192` |
| `LLAMA_N_GPU_LAYERS` | `-1` (all layers on GPU/Metal) |
| `LLAMA_N_THREADS` | CPU count |

Set in NiazFinder (`.env.local`):

```env
LOCAL_LLM_ONLY=true
NEED_INTAKE_LLM_URL=http://127.0.0.1:8100
NEED_INTAKE_LLM_MODEL=gemma-4-e2b-q4_0-it
AI_AGENT_ENABLED=true
AGENT_LLM_BASE_URL=http://127.0.0.1:8100
AGENT_LLM_MODEL=gemma-4-e2b-q4_0-it
```

## Smoke test

With the service running:

```bash
npm run smoke:gemma4-intake
```

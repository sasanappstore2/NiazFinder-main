## Local dev runbook (fast start)

This repo has 4 runtimes you may run locally:

- **Next.js** (web + Next route handlers) on **:3000**
- **Nest backend** (`mini-services/backend`) on **:4000** (default)
- **Chat service** (`mini-services/chat-service`) on **:3004** (default)
- **Intake MLX** (`mini-services/intake-mlx`) on **:8100** (optional — Mac, local ML)

> Note: `docs/DEBUG_PLAYBOOK.md` already contains “recovery when broken”. This file focuses on a clean local start.

### 0) Prereqs

- Node.js (repo Dockerfiles use Node 20)
- Bun (scripts `dev:backend` / `dev:chat` use bun)

### 1) Install deps

From repo root:

```bash
npm install
```

### 2) Set env

- Copy `.env.example` → `.env.local` (preferred for local) or `.env`
- Minimum common ones you will likely need:
  - `DATABASE_URL=...`
  - `NEXT_PUBLIC_API_URL=...`
  - `NEXT_PUBLIC_CHAT_SOCKET_URL=...`
  - `NEXT_PUBLIC_TYPING_WS_URL=...` (if using typing WS)

See `docs/ENV_MAP.md` for the full map.

### 3) Start services (recommended order)

Terminal A (backend):

```bash
npm run dev:backend
```

Terminal B (chat-service):

```bash
npm run dev:chat
```

Terminal C (Next):

```bash
npm run dev
```

Terminal D (optional — MLX on Mac):

```bash
npm run export:intake-dataset
npm run dev:intake-mlx
```

Hybrid parse (add to `.env.local`):

```bash
NEED_INTAKE_LLM_ENABLED=true
NEED_INTAKE_LLM_URL=http://127.0.0.1:8100
```

Optional — show parse preview on the **home** «نیازتان را بگویید» box (calls the same `/api/need-intake/parse-intent` before navigating to `/post`; requires `npm run dev` restart):

```bash
NEXT_PUBLIC_INTAKE_HOME_PREVIEW=1
```

### 4) Quick health checks

From root:

```bash
npm run smoke:routes
npm run smoke:api
```

If you changed need-intake rules:

```bash
npm run test:intake-parser
npm run test:intake-flow
npm run test:intake-dataset
```

MLX (requires `dev:intake-mlx` running):

```bash
npm run smoke:intake-mlx
```

Home landing → `parse-intent` (requires **Next dev** on `:3000`; sample املاک):

```bash
npm run smoke:need-intake-home-parse
```

If you changed typing analysis:

```bash
npm run test:typing-analysis
```


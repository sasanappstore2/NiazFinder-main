## Local dev runbook (fast start)

This repo has 4 runtimes you may run locally:

- **Next.js** (web + Next route handlers) on **:3000**
- **Nest backend** (`mini-services/backend`) on **:4000** (default)
- **Chat service** (`mini-services/chat-service`) on **:3004** (default)
- **Intake MLX** (`mini-services/intake-mlx`) on **:8100** — **required for Qwen intake AI** (Mac)

> Note: `docs/DEBUG_PLAYBOOK.md` already contains “recovery when broken”. This file focuses on a clean local start.

### Minimal stack (need intake with AI)

Terminal A — database:

```bash
docker compose up -d postgres redis
npm run db:migrate   # or db:push in dev
```

Terminal B — Qwen (intake-mlx):

```bash
npm run dev:intake-mlx
npm run smoke:intake-mlx   # optional health check
```

Terminal C — Next:

```bash
npm run dev
```

Add to `.env.local`:

```bash
NEED_INTAKE_LLM_ENABLED=true
NEED_INTAKE_LLM_URL=http://127.0.0.1:8100
NEED_INTAKE_LLM_TIMEOUT_MS=12000
```

Backend (`:4000`) and Chat (`:3004`) are optional unless you need auth, chat, or typing WebSocket features.

### Full stack (all features)

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

Terminal D (MLX on Mac — Qwen intake AI):

```bash
npm run dev:intake-mlx
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

### Image upload optimization

New uploads (business media + chat images) are re-encoded server-side with **Sharp → WebP** (high quality, smaller size). Optional env overrides:

```bash
IMAGE_OPTIMIZE_QUALITY_PRODUCT=86
IMAGE_OPTIMIZE_QUALITY_LOGO=90
IMAGE_OPTIMIZE_QUALITY_COVER=85
IMAGE_OPTIMIZE_QUALITY_CHAT=82
```

Self-test:

```bash
npx tsx src/lib/image/fixtures/run-optimize-upload-self-test.ts
```

Batch recompress existing files under `public/uploads/` (dry-run first):

```bash
npx tsx scripts/optimize-existing-uploads.ts
npx tsx scripts/optimize-existing-uploads.ts --apply
```

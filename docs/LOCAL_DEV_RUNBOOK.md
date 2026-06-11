## Local dev runbook (fast start)

> **Intake docs hub:** [`INTAKE_INDEX.md`](./INTAKE_INDEX.md) · **Execution plan:** [`INTAKE_EXECUTION.md`](./INTAKE_EXECUTION.md)

This repo has 4 runtimes you may run locally:

- **Next.js** (web + Next route handlers) on **:3000**
- **Nest backend** (`mini-services/backend`) on **:4000** — **optional**, docker profile `legacy` only
- **Chat service** (`mini-services/chat-service`) on **:3004** (default)
- **Intake MLX** (`mini-services/intake-mlx`) on **:8100** — **required for Qwen intake AI** (Mac)

> Location registry bridge: see [`docs/LOCATION_REGISTRY.md`](LOCATION_REGISTRY.md).

> Note: `docs/DEBUG_PLAYBOOK.md` already contains “recovery when broken”. This file focuses on a clean local start.

### `/post` need intake (minimal)

| Step | Command |
|------|---------|
| 1. DB | `docker compose up -d postgres redis` + `npm run db:push` |
| 2. MLX | `npm run dev:intake-mlx` |
| 3. Next | `npm run dev` |
| 4. Verify | `npm run test:post-pipeline` (rules) |
| 5. MLX gate | `NEED_INTAKE_LLM_ENABLED=true npm run test:post-mlx-gate` |

Open: http://localhost:3000/post — or from home with `?seed=` + `?city=`

Full architecture: [`NEED_INTAKE.md`](./NEED_INTAKE.md)

---

### Minimal stack (need intake with AI)

Terminal A — database:

```bash
docker compose up -d postgres redis
npm run db:migrate   # or db:push in dev
```

Terminal B — Qwen (intake-mlx, **estate LoRA by default**):

```bash
npm run dev:intake-mlx
npm run smoke:intake-mlx   # optional — checks adapterPath + parse
```

Legacy general intake LoRA (`intake-lora-v2`) for A/B:

```bash
npm run dev:intake-mlx:legacy
```

One-command stack (MLX + Next):

```bash
npm run dev:need-intake
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

# Dev/staging: auto-approve published needs (production: false or unset)
NEED_INTAKE_AUTO_APPROVE=true
NEED_AUTO_APPROVE_REQUESTS=true

# Required in production for internal moderation enqueue
# INTERNAL_API_SECRET=generate-with-openssl-rand-hex-32

# Browse maps + pin pickers — default: local Iran Divar vector map (no Mapbox token required)
# See docs/MAP_LOCAL_SETUP.md
# NEXT_PUBLIC_MAP_SURFACE=vector
# Optional Mapbox path (only if token set): NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ...
# NEXT_PUBLIC_MAPBOX_STYLE_URL=mapbox://styles/your-account/style-id
```

### Map (local Iran Divar)

After clone or if the map looks empty:

```bash
npm run map:verify-cache    # disk cache health (no network)
npm run map:prewarm-iran    # if verify fails (~1 GB)
npm run dev
npm run smoke:map           # vector + glyph + browse pages on :3000
```

Backup tiles before `rm -rf .next` or machine migration: `npm run map:backup-cache`

Full guide: [`MAP_LOCAL_SETUP.md`](MAP_LOCAL_SETUP.md)

Backend (`:4000`, Nest) is **legacy** — use `docker compose --profile legacy up backend` only if you still need it. Chat (`:3004`) is optional unless you need auth, chat, or typing WebSocket features.

### Full stack (all features)

Nest backend (legacy profile):

```bash
docker compose --profile legacy up -d backend
# or: npm run dev:backend
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

Optional — show parse preview on the **home** «نیازتان را بگویید» box (uses `POST /api/intake/analyze`; requires `npm run dev` restart):

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
# health should show adapterPath ending in estate-intake-lora-v1
curl -s http://127.0.0.1:8100/health | jq .adapterPath
```

Estate LLM benchmark (MLX + reconcile):

```bash
NEED_INTAKE_LLM_ENABLED=true npm run test:estate-benchmark:llm
```

Home landing → intake analyze (requires **Next dev** on `:3000`; sample املاک):

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

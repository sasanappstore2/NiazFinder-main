# Adapter Rollback Runbook ? Phase 38.9

When a new LoRA adapter fails `eval:intake-adapter-gate` or regresses in production.

## 1. Identify active adapter

```bash
cat models/intake-adapter-registry.json | jq '.adapters[] | select(.status=="active")'
```

## 2. Stop promotion

Set candidate adapter `status` to `retired` (do not set `active` until gate passes).

## 3. Point MLX to previous adapter

```bash
export INTAKE_MLX_ADAPTER_PATH="$(pwd)/models/estate-intake-lora-v1"
npm run dev:intake-mlx
curl -s http://127.0.0.1:8100/health | jq .adapterPath
```

## 4. Verify Next.js

```bash
NEED_INTAKE_LLM_ENABLED=true npm run test:post-mlx-gate
```

## 5. Update registry

- Mark failed adapter `retired`
- Restore previous `active` entry `baselineAccuracyPct`
- Bump `updatedAt` in `models/intake-adapter-registry.json`

## 6. Post-mortem

- Export weekly dataset: `npm run export:intake-training-weekly`
- Review rejects in admin ? Intake Training dashboard
- Target: **+2% accuracy per quarter** (`quarterlyAccuracyTargetDeltaPct`)

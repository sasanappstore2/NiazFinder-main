# Phase 47 ? Cache & MLX Cluster

**Prerequisite:** Phase 46 (`phase46Complete`)

## Scope (10 items)

| # | Item |
|---|------|
| 47.1 | Redis parse cache |
| 47.2 | cache key = hash(text+version) |
| 47.3 | MLX 2 instance LB |
| 47.4 | model hot-swap |
| 47.5 | adapter A/B |
| 47.6 | cost metric per inference |
| 47.7 | p99 < 3s cached |
| 47.8 | invalidate on schema bump |
| 47.9 | monitor Redis memory |
| 47.10 | tag `intake-scale-v1` |

## Verify

```bash
npx tsc --noEmit
npm run test:intake-scale
npm run verify:intake-phase -- --phase 47
```

## Next

**Phase 48 ? Edit & Resubmit Flow** (`INTAKE_PHASE48_KICKOFF.md`)

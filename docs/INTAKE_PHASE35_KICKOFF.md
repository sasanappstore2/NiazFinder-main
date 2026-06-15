# ??? ?? ? Title/Copy Pipeline v2

**?????:** ?????  
**????????:** ??? ?? (`phase34Complete`)

## ????????

| # | ??? |
|---|-----|
| 35.1 | Title provider facade |
| 35.2 | Copy provider facade |
| 35.3 | Quality score 0?1 + badge |
| 35.4 | Block publish if score < 0.5 (flag) |
| 35.5 | LoRA per vertical config |
| 35.6 | Weekly title eval script |
| 35.7 | Weekly copy eval script |
| 35.8 | Tag `intake-ai-v2` |
| 35.9 | Prefill accuracy KPI ? 75% |
| 35.10 | Retro AI block 31?35 |

## ?????

```bash
npx tsc --noEmit
npm run test:intake-listing-ai-v2
npm run test:post-pipeline
npm run verify:intake-phase -- --phase 35
```

## ??? ????

**??? ?? ? Telemetry**

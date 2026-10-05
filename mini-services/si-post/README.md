# Private Si worker for `/post`

This worker loads only `convaiinnovations/si-multilingual` through the official
`si.load()` API. It does not use the router and is reachable only on loopback.

```bash
npm run setup:si-post
npm run dev:si-post
```

The Next.js route `/api/post/natural-analyze` proxies requests to
`http://127.0.0.1:8101/predict`. The model is downloaded once by the official
Hugging Face Hub client and reused from its cache. Set `SI_CACHE_DIR` to choose
the cache root, and `SI_DEVICE=auto|mps|cuda|cpu` to choose the runtime device.

The worker keeps running when the optional environment is missing or the checkpoint
cannot load; `/health` then reports `model_loaded: false` and the web form remains
usable manually.

## Explicit local research-adapter evaluation

Fine-tuned Divar-derived adapters are synthetic research artifacts, not real-need
ground truth and never production-authorized. The worker will not load one unless
all of these are explicitly set after the training run has completed and selected
a best checkpoint:

```bash
SI_MODEL_PATH=/absolute/path/to/pinned/si/snapshot
SI_ADAPTER_PATH=/absolute/path/to/experiment/best-adapter.safetensors
SI_ADAPTER_MANIFEST=/absolute/path/to/experiment/manifest.json
SI_ALLOW_RESEARCH_ADAPTER=true
```

The manifest must mark the run `research_run_complete`, `experimentOnly: true`,
and `productionLoadAllowed: false`. The worker also verifies the pinned model
revision and base-weight SHA-256, the complete research field set, adapter tensor
names/shapes/count, and accepts only `best-adapter.safetensors`. `/health` reports
`adapter_mode: research_only` and its checksum when active. This switch is for
local shadow/evaluation only; it does not change the app's production model or
promote this adapter to production.

The adapter gate is pinned to the v3 exact-city Divar-derived corpus hash
(`aeb532dc7fbeafd7a74bcc4d597d50eae1722eb6d558f4f09ed267e071f63641`) used by
the 2026-09-28 MPS experiment. Adapters trained from v1/v2 or other corpus
versions are rejected rather than silently treated as equivalent.

## Fa-buyer Persian template adapter (separate opt-in)

Adapters trained on the NiazFinder Persian buyer-template corpus
(`scripts/datasets/finetune/train-si-fa-buyer-head.py`) use a different,
independently gated path and cannot ride the research-adapter switch:

```bash
SI_MODEL_PATH=/absolute/path/to/pinned/si/snapshot
SI_FA_BUYER_ADAPTER_PATH=/absolute/path/to/experiment/best-adapter.safetensors
SI_FA_BUYER_ADAPTER_MANIFEST=/absolute/path/to/experiment/manifest.json
SI_ALLOW_FA_BUYER_ADAPTER=true
```

Only one adapter opt-in may be active at a time. The manifest must mark the run
`status: complete`, `experimentOnly: true`, `productionLoadAllowed: false`,
`labelProvenance: deterministic_fa_template_from_catalog_label`, and
`sourceDataset: niazfinder-fa-buyer-persian-templates`, and the worker verifies
the pinned model revision, base-weight SHA-256, the same three training fields,
tensor names/shapes/count, and that only `best-adapter.safetensors` is provided.
`/health` reports `adapter_mode: fa_buyer_experiment`. The same honesty rules
apply: template labels are not real-need ground truth, and neither switch makes
either adapter production-loadable.

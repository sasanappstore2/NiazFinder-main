I've reviewed the batch11 report and the open multi-model-review findings. Rather than issuing a blind Batch 12 (which would layer more extractor fixes on top of two unresolved **critical** bugs — the stale `smartResult`/abort race and the dual-pipeline last-writer-wins merge issue), I'm pausing the loop and flagging that backlog for human review before continuing.

I attempted to write `PLAN/cursor-report-batch12-backlog-pause.md` with the prioritized backlog but the write was denied by permissions. Summary of the backlog (highest priority first):

1. **[critical]** Stale `smartResult`/abort race — no text-hash, cleared fields get refilled, apply happens outside compose
2. **[critical]** Dual pipelines (smart 300ms vs intelligence 500ms) — last-writer-wins, no single merge policy
3. **[warning]** `/api/intake/smart-extract` — no rate limit/body cap, `useAI` defaults on
4. **[warning]** Neighborhood soft-fill missing
5. **[warning]** `area` marked answered from `parsed.city` alone
6. **[warning]** soft-fill `dealType` bypasses `recomputeNeedDraft`
7. **[lone]** Magnitude BUY/RENT inference leaking outside real-estate context
8. **[lone]** Fragile billion/million unit detection

Recommendation: fix items 1–2 before any further batch-style extractor work, since they can silently overwrite correct extractor output regardless of how many batch self-tests pass.

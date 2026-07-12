# Multi-model review synthesis — Smart Intake /post hotfixes

**Models (all complete):** [composer-2.5](63da0034-5bc4-4759-b32b-4339517da7d9), [composer-2.5-fast](e7c8af6a-0489-4854-a6a0-7a40ff6e34e5), [grok-4.5](bbfaf3b8-fda3-4bfc-8348-ff9ebb9f6ff0), [opus-4.8](370d820d-ef77-49a8-914e-44d64ab83205), [gpt-5.5](f6489048-377a-41db-bad6-ab1232877679)

**Intent:** Production-ready `/post` Smart Intake after crash + deposit/rahn hotfixes.

## Consensus — act on

| Sev | Issue | Status |
|-----|--------|--------|
| **critical** | Stale `smartResult` / abort race (no text-hash; re-fills cleared fields; apply outside compose) | open |
| **critical** | Dual pipelines last-writer-wins (smart 300ms vs intelligence 500ms) | open |
| **warning** | `budgetMax ≥ 50M` → رهن/ودیعه without rent deal gate | **fixed in Batch 3** |
| **warning** | Public `/api/intake/smart-extract` no rate limit / body cap; `useAI` defaults on | open |
| **warning** | Neighborhood soft-fill missing | open |
| **warning** | Scale ~100 Mashhad ≠ 1000 cases | open |
| **warning** | `area` marked answered if only `parsed.city` | open |
| **warning** | soft-fill `dealType` bypasses `recomputeNeedDraft` | open |

## Strong lone findings (esp. opus)

- Magnitude BUY/RENT inference outside real-estate → corrupt non-property needs
- Latent loop risk in location-section repair if template lacks `neighborhood`
- Fragile billion/million unit detection

## Hotfixes

| Fix | Verdict |
|-----|---------|
| Entity guards (max update depth) | OK |
| setTimeout debounce | OK |
| Image preview removed | OK |
| deposit↔rahn mirror | OK on soft-fill; races remain |
| budgetMax→رهن gate | Fixed Batch 3 |

## Next (ordered)

1. Text-hash / once-per-result soft-fill + compose guard  
2. Single merge policy for smart vs intelligence  
3. Soft-fill high-confidence neighborhood  
4. API: rate-limit, max body, `useAI` default false  
5. Fix `area && city`; expand fixtures  

Full reports live in each reviewer transcript. Production loop continues with Claude PM.

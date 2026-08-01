## گزارش مرحله 6+7 (Perf + API/E2E) — Cursor → Claude

### ✅ Performance (3 runs × 100 cases)
| Run | Avg | P95 | Heap Δ |
|-----|-----|-----|--------|
| 1 | 15.3ms | 50ms | +48.8MB (cold catalog/OSM load) |
| 2 | 12.7ms | 50ms | -9.6MB |
| 3 | 12.8ms | 50ms | +6.0MB |

- Target <20ms avg: **PASS** (steady ~13ms)
- Suite still **100/100** (avg 18ms in full runner with assertions)

### ✅ API smoke
- File: `src/intake/smart-extractor/tests/api-smoke.test.ts` → **PASS**
- JSON round-trip OK for 3 cases
- Live HTTP `POST /api/intake/smart-extract` فردوسی → disambiguation **OK**

### ✅ E2E /post integration status
- **Integrated** (not skipped): `NeedIntakePanel` uses `useRealtimeExtraction` (300ms debounce → API → fill empty fields only)
- Manual browser UX not re-run this turn; wiring confirmed in code + live API

### Notes / deviations from directive snippet
- No `smartExtract` export/`index.ts` — used `extractSmartFields` directly
- No `need-intake-form.tsx` — integration is `NeedIntakePanel.tsx`
- Cold-start heap >10MB expected (OSM+catalog); warm runs fine

### 🎯 Awaiting your next directive (Phase 2 / deeper integration / 100 human-like listings deliverable)

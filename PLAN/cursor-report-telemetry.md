## گزارش Telemetry — Cursor → Claude

### ✅ انجام شده:
1. `src/lib/need-intake/smart/telemetry/smart-intake-telemetry.ts`
   - extraction requested/completed (latency, flags, no raw text)
   - disambiguation shown/applied
   - smart title shown/applied
2. Wired:
   - `use-realtime-extraction.ts` → request/response
   - `IntakeLocationAmbiguityPrompt.tsx` → shown/applied
   - `NeedListingPreview.tsx` → title shown/applied
3. Self-test: `smart-intake-telemetry.self-test.ts` → OK

### Adaptations:
- `trackAnalyticsEvent(name, properties)` (repo signature) — not (name, category, props)
- Paths are under `need-intake/` not `components/post/`
- No PII: textLength only

### 📊 Suites:
- test:smart-intake 100/100
- title-generation OK
- location-ambiguity OK
- telemetry self-test OK

### 🎯 Next:
Issue next "## Claude → Cursor" or **PAUSE LOOP** with remaining backlog.

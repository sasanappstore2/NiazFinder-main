## گزارش UI Disambiguation Wiring — Cursor → Claude

### ✅ انجام شده (دستور شما مو‌به‌مو):
1. `IntakeLocationAmbiguityPrompt.tsx`
   - prop جدید `smartResult?: SmartExtractionResult | null`
   - `buildSmartLocationOptions()` از `location.alternatives`
   - merge + dedupe با legacy `parsedIntent` options
   - onSelect: اول smart hit، بعد legacy
2. `NeedIntakePanel.tsx`
   - `smartResult={smartRealtime.result}`
   - onApplyNeighborhood: resolve از smart alternatives → setSelectedNeighborhood + patchIntakeField + toast با نام محله

### 📊 Verification:
- Self-test: `run-smart-location-ambiguity-self-test.ts` → OK (فردوسی / توس فردوسی / فردوسی ۱۰)
- `npm run test:smart-intake` → **100/100**
- Live API فردوسی → `disambiguationNeeded: true`, alts شامل فردوسی/توس فردوسی/دانشگاه فردوسی/فردوسی ۱۰

### Acceptance vs your criteria:
1. Ambiguous alternatives as chips — **wired** (shows when smartResult has ≥2 alts or disambiguationNeeded)
2. Chip applies neighborhood+slug — **yes**
3. Legacy parsedIntent still works — **yes**
4. Updates location + draft — **yes**
5. Toast with name — **yes** (`محله X انتخاب شد`)

### 🎯 Next:
Issue next "## Claude → Cursor" batch (backlog #2 auto title/description, or telemetry, or stop).

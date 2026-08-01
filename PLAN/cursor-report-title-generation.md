## گزارش Auto Title/Description — Cursor → Claude

### ✅ انجام شده:
1. Created `src/lib/need-intake/smart/utils/title-generator.ts`
   - `generateSmartTitle` / `generateSmartDescription` on real `SmartExtractionResult` shape
   - fa-IR number formatting for budgets
2. Wired `NeedListingPreview.tsx` (repo has no IntakePreview.tsx):
   - `smartResult` prop
   - empty fields show suggested placeholder + «پیشنهاد هوشمند»
   - one-click apply for title/description
   - user-typed values always win
3. `NeedIntakePanel.goToPreview`: fallback fill from smart when deterministic/composed empty
4. Test: `src/intake/smart-extractor/tests/title-generation-self-test.ts` → **OK**

### 📊 Verification:
- title-generation self-test PASS
- `npm run test:smart-intake` → **100/100**

### Adaptations (schema mismatch):
- Your snippet referenced `categoryKey` / `intent` / `time` — mapped to actual fields (`category.value`, `budget.depositAmount`, `metadata.urgency`)
- Preview component is `NeedListingPreview`, not `IntakePreview`

### 🎯 Next:
Issue next "## Claude → Cursor" (telemetry backlog #3?) or PAUSE LOOP.

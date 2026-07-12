## گزارش مرحله 2 (Core Engine) — Cursor → Claude

### ✅ انجام شده:
1. `src/intake/smart-extractor/types.ts` — SmartExtractionResult + options + AdvancedRulePatch
2. `src/intake/smart-extractor/rules/advanced-rules-engine.ts` — rules: deposit_rent_combined, full_deposit, rooms, area_advanced, floor_info, neighborhood_with_context, amenities (+ parseAmount)
3. Enhanced `src/intake/smart-extractor/smart-field-extractor.ts`:
   - types imported from types.ts
   - applyAdvancedRules integrated first in extractWithRules
   - existing attributeExtractors / transactionExtractor fill gaps
   - AI + LRE via **dynamic import** (so rules-only smoke does not hit `server-only`)
   - disambiguation skipped when `useAI: false`
   - fixed inferTransactionFromBudget for FULL_DEPOSIT without requiring >500M
4. Smoke test: `src/intake/smart-extractor/tests/smoke-test.ts` (`.ts` not `.tsx` — no JSX; same content)

### 📊 Smoke test output (full):
```
Input: آپارتمان 2 خواب 100 متر برای اجاره در سجاد مشهد
  ✅ rooms=2 area=100 neighborhood=سجاد type=RENT  (9ms)

Input: خونه میخوام 100 میلیون رهن 10 میلیون اجاره احمدآباد
  ✅ type=DEPOSIT_AND_RENT deposit=100000000 rent=10000000  (2ms)
  note: neighborhood احمدآباد NOT extracted in this case (not asserted)

Input: رهن کامل 500 میلیون 3 خواب با پارکینگ و آسانسور
  ✅ rooms=3 type=FULL_DEPOSIT deposit=500000000 parking elevator  (1ms)

=== Smoke summary: 3/3 passed ===
```

### ⚠️ مشکلات / notes:
- Top-level import of intelligence-engine crashed smoke with `server-only` → fixed via dynamic import
- Claude draft called `resolveLocationViaLre` with wrong arity; wired to real `(normalized, raw, input)` + `candidates`
- Did not create parallel duplicate of intakeEngine; advanced rules + existing extractors + optional intelligence
- Case 2 leaves neighborhood null for «احمدآباد» (whitelist/pattern gap) — ready for Step 3 disambiguation data

### 🎯 Next:
Awaiting your Step 3 directive (Neighborhood Disambiguation Engine + modal), or revise.

Branch: `feature/smart-intake-system`

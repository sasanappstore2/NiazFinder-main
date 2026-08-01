## گزارش مرحله 1 (Setup) — Cursor → Claude

### ✅ انجام شده:
- Backup: `src/intake.backup.20260711`, `src/components/need-intake.backup.20260711`
- Branch: `feature/smart-intake-system` (checked out)
- Deps installed: `lodash`, `debounce`, `string-similarity` (+ `@types/lodash`, `@types/string-similarity`, `@testing-library/react`)
- Dirs: `src/intake/smart-extractor/{rules,ai,disambiguation,validators,tests,cache,monitoring}`
- Plan files present and read:
  - CURSOR_COORDINATION_GUIDE.md (391 lines)
  - SMART_INTAKE_IMPLEMENTATION_PLAN.md (1228 lines)
  - SMART_INTAKE_TEST_SCENARIOS.md (531 lines)

### ⚠️ مشکلات / notes:
- `string-similarity@4.0.4` npm deprecation warning (still installed as you requested)
- Did **not** install `jest` (repo uses `tsx` self-tests; can add if you insist)
- Pre-existing draft from your earlier session:
  - `src/intake/smart-extractor/smart-field-extractor.ts` (530 lines, has `extractSmartFields`)
  - `src/hooks/use-smart-intake.ts` (337 lines)
- Repo working tree was already very dirty before this branch (crawler, filings, etc.) — Smart Intake work is on this branch alongside that

### 📊 Metrics:
- Step 1 status: COMPLETE
- Ready for Step 2

### 🎯 Next steps (awaiting your order):
Please confirm: proceed to Step 2 (types.ts + advanced-rules-engine.ts + wire extractSmartFields smoke test), or revise scope to reuse existing intelligence-engine instead of parallel stack?

Reply ONLY with a concrete Cursor directive block:
1) files to create/edit
2) acceptance criteria
3) tests to run

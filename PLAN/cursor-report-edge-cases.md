## گزارش Edge-case hardening (#4) — Cursor → Claude

### ✅ Implemented in `use-realtime-extraction.ts`:
1. Skip API if combined trimmed text `< 3` chars
2. Truncate at 5000 with word-boundary preference + console.warn
3. Network retry max 2 with 1s/2s backoff (network errors only)
4. Debounce: mobile `<768` → 500ms, else 300ms (or explicit override)
5. `mountedRef` + abort on unmount (no setState after unmount)
6. Strip ZW chars `\u200B\u200C\u200D\uFEFF` before send
7. (Disambiguation timeout skipped — lives server-side; not in this hook per your "Do NOT touch disambiguation UI")

### Tests:
- Created `src/hooks/fixtures/run-realtime-extraction-edge-self-test.ts` (tsx; repo has no jest for hooks)
- **PASS** empty/ZW/truncate/debounce helpers
- `npm run test:smart-intake` still **100/100**

### Note:
`npm test -- use-realtime-extraction` not applicable (no jest suite). Use:
`npx tsx src/hooks/fixtures/run-realtime-extraction-edge-self-test.ts`

### 🎯 Next:
PAUSE LOOP or next batch.

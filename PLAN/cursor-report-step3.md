## گزارش مرحله 3 (Neighborhood Disambiguation) — Cursor → Claude

### ✅ انجام شده:
1. `src/intake/smart-extractor/disambiguation/types.ts`
2. `src/intake/smart-extractor/disambiguation/neighborhood-disambiguator.ts`
   - uses `findManagedNeighborhoodAmbiguity`
   - loads real OSM: `data/neighborhoods/cache/osm-streets/mashhad-*.json`
   - street vs محله context boost
3. Wired into `smart-field-extractor.ts` after neighborhood extraction
4. Tests + scripts:
   - `npm run test:intake:disambiguation` → **PASS** 3/3 + integration
   - `npm run test:smart-intake-smoke` → **PASS** 3/3
5. Fixed Persian `\b` bug so «احمدآباد» extracts in deposit+rent smoke case

### 📊 Disambiguation results (real data):
- احمدآباد → candidates include managed `احمدآباد`, sub-areas بهشت / آیت‌الله خامنه‌ای, OSM جاده‌ها
- خیابان فردوسی → managed فردوسی / توس فردوسی / دانشگاه فردوسی + OSM فردوسی ۳/۷/۱۰/۱۳/۱۵; `disambiguationNeeded=true`
- محله احمدآباد → managed exact boosted (conf 0.99)

### ⚠️ notes:
- Used `tsx` not `bun test` (repo convention)
- Added `test:intake:disambiguation` and `test:smart-intake-smoke` to package.json
- No fake «فردوسی شمالی/جنوبی» invented — real catalog + OSM numbered streets

### 🎯 Next:
Awaiting Step 4 directive (Real-time UI / auto-filler / modal), or revise.

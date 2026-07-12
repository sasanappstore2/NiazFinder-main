# Estate Colloquial 1000 Loop

**Started:** 2026-07-12  
**Corpus:** `fixtures/estate-needs-colloquial-1000.md` (+ `.jsonl`)  
**Runner:** `scripts/intake/run-estate-colloquial-one.ts` → same engine as `/post` analyze  

## Corpus

- 1000 Persian colloquial real-estate needs, 100–300 words (avg ~195)
- 397 cities from `iran-locations-tree.json`, all RE leaf categories
- Oracle-compatible with estate-paragraph scorer

## Fixes this session (Freeze-safe rule/lexicon)

1. `رهن` false positive inside «رهگیری» → `رهن(?!گیری)`
2. «قصد خرید» added to sale/buy phrases
3. Hints: industrial / land / agency / construction-partnership / pre-sale / hiring
4. Collision boosts for colloquial industrial/land/agency phrases
5. Agency deal N/A in oracle hard tier

## Gate snapshot

- category-intent-engine: 10/10
- estate-collision-golden: 30/30
- smoke first 25: improving toward 25/25 hard (location soft misses remain)

## Loop

Dynamic wake `AGENT_LOOP_WAKE_estate_colloquial` — one case per tick: analyze → fix → next.

## Smart Intake — 1000-case corpus

### Done
- Hand goldens 1–100 unchanged
- `corpus-1000.ts` adds scenarios **101–1000** (Tehran + Mashhad)
- Coverage: rent, رهن+اجاره, رهن کامل, buy, buy-range, amenities, urgency, service, rent↔buy, budget bounds, deposit/rent ranges, pre-sale, floors, colloquial, long-noise

### Result
```
Total: 1000/1000 passed
Success Rate: 100%
Total Time: ~30s | Avg ~30ms | P95 ~50ms
```

### Runner
- `npm run test:smart-intake` now expects **1000** cases
- Exit threshold raised to **95%** and requires full green

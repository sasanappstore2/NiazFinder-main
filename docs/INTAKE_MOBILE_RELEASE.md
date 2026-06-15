# فاز ۳۰ — موبایل Release

## خروجی

- `intake-mobile-v1` tag
- `reports/intake-mobile-kpi.json`
- lazy `location` + `preview` steps
- ۱۰ bugfix Persian/corruption

## تست

```bash
npm run test:mobile-release
npm run verify:intake-phase -- --phase 30
SKIP_MLX_GATE=true npm run test:intake-baseline
```

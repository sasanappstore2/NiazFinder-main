# فاز ۳۱ — AI Provider Interface ✅

**تاریخ:** ۲۰۲۶-۰۶-۰۹ · **وضعیت:** ۱۰/۱۰

## هدف

`IntakeAiProvider` با Rules-First + MLX + Cloud composite.

## خروجی‌ها

| # | بخش | فایل |
|---|-----|------|
| ۳۱.۱ | Interface | `src/intake/ai/provider.ts` |
| ۳۱.۲ | RulesOnly | `src/intake/ai/rules-only-provider.ts` |
| ۳۱.۳ | MLX | `src/intake/ai/mlx-provider.ts` |
| ۳۱.۴ | Cloud | `src/intake/ai/cloud-provider.ts` |
| ۳۱.۵ | Composite | `src/intake/ai/composite-provider.ts` |
| ۳۱.۶ | Route | `src/app/api/intake/analyze/route.ts` |
| ۳۱.۷ | Env | `NEED_INTAKE_AI_PROVIDER` + `intake-ai-config.ts` |
| ۳۱.۸ | تست | `npm run test:intake-ai-provider` |
| ۳۱.۹ | ADR | `docs/adr/003-intake-ai-provider.md` |
| ۳۱.۱۰ | UI boundary | بدون import MLX در components/hooks |

## تأیید

```bash
npm run test:intake-ai-provider
npm run verify:intake-phase -- --phase 31
npx tsc --noEmit
```

## فاز بعدی

**فاز ۳۲ — Merge & Reconcile** ✅ → [INTAKE_PHASE32_KICKOFF.md](./INTAKE_PHASE32_KICKOFF.md)

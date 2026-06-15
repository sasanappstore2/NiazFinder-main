# Intake release checklist

> **فاز ۵** — `npm run test:intake-baseline`  
> مرجع: [`INTAKE_EXECUTION.md`](./INTAKE_EXECUTION.md) · [`reports/intake-baseline.json`](../reports/intake-baseline.json)

---

## یک دستور (CI + محلی)

```bash
SKIP_MLX_GATE=true npm run test:intake-baseline   # CI (~68s)
npm run verify:intake-phase -- --phase 5          # 10/10 checks
```

با MLX (محلی + `dev:intake-mlx`):

```bash
npm run test:intake-baseline   # + post-mlx-gate
```

HTTP smoke (نیاز به `npm run dev`):

```bash
npm run test:post-api-smoke
```

---

## Gateهای baseline (۱۰ مرحله)

| # | Gate |
|---|------|
| 1 | `tsc` |
| 2 | `draft-roundtrip` |
| 3 | `post-pipeline` (153 golden) |
| 4 | `publish-validator` |
| 5 | `publish-browse-parity` |
| 6 | `post-estate-scenarios` |
| 7 | `post-intake-scenarios` |
| 8 | `legacy-canonical-compare` |
| 9 | `intake-deprecated-routes` (410) |
| 10 | `intake-golden-report` → `reports/intake-golden.html` |

---

## QA دستی (۵.۹)

- [ ] iOS Safari — wizard کامل
- [ ] Android Chrome — wizard کامل
- [ ] دسکتاپ — seed از homepage

---

## تأیید پایان هر فاز

```bash
npm run verify:intake-phase -- --phase <N>
```

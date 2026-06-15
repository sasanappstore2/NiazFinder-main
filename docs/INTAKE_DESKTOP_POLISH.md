# Desktop Polish (فاز ۲۵)

پالایش UX دسکتاپ برای ویزارد `/post`.

## تغییرات

| # | موضوع |
|---|--------|
| ۲۵.۱ | گرید ۸px — `--intake-space-1` تا `--intake-space-4` |
| ۲۵.۲ | آیکون‌های یکسان — `intake-wizard-icons.ts` |
| ۲۵.۳ | empty state هر مرحله — `IntakeStepEmptyState` |
| ۲۵.۴ | لینک راهنما — `/help#intake-*` per vertical |
| ۲۵.۵ | میانبر `?` — `IntakeKeyboardShortcutsHint` |
| ۲۵.۶ | چاپ پیش‌نمایش — `@media print` |
| ۲۵.۷ | QA ۵۰ مورد — `INTAKE_DESKTOP_QA.md` |

## تست

```bash
npm run test:desktop-polish
npm run verify:intake-phase -- --phase 25
```

# فاز ۲۶ — Fullscreen Stepper موبایل

## هدف

ویزارد intake در موبایل full-viewport با header/footer ثابت.

## ۱۰ بخش

1. `IntakeMobileShell.tsx`
2. header: back + title + step N/4
3. footer: primary CTA 56px
4. hide site header در intake mobile
5. swipe back guarded
6. `100dvh` layout
7. تست iOS Safari
8. تست Android Chrome
9. lighthouse a11y > 90
10. breakpoint < 768

```bash
npm run verify:intake-phase -- --phase 26
```

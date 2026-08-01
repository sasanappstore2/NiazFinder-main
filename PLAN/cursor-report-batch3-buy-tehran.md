## گزارش Cursor → Claude — Batch 3 (تهران خرید / anti-ودیعه)

### نتیجه: **PASS** (گیت dealType)

### FAIL اولیه (بدون فیکس)
- extract: BUY + budgetMax=2e9 + سعادت‌آباد + rooms=2 — OK
- UI `resolveFieldValue(rahnAmount)` → **2e9** به‌عنوان رهن (باگ اجماعی multi-model)

### فیکس
- `src/intake/state/resolveFieldValue.ts`
- `src/components/need-intake/IntakeCategoryFilterFields.tsx`  
  fallback `budgetMax≥50M → رهن/ودیعه` فقط اگر transaction/deal از نوع اجاره/رهن باشد.

### بعد از فیکس
- uiRahn=undefined, uiDep=undefined برای BUY
- depositAmount/rentAmount ساخته نشد
- suite 100/100

### Soft-gap
- «۲ میلیارد و ۵۰۰» → فعلاً 2e9 (نه 2.5e9)
- category هنوز null روی این متن (BUY از buy_from_build_intent)

BATCH 4 بده. Deploy ممنوع.

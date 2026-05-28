# OBISIDIAN — نقشه محصول NiazFinder

Vault محلی برای **فکر کردن محصولی** و رشد تدریجی سایت.

## شروع (۳۰ ثانیه)

1. Obsidian → Open vault → پوشه `OBISIDIAN/`
2. باز کن: **`00_Product_MOC/ProductMap.md`**
3. Graph → فیلتر پیش‌فرض: بخش‌های محصول (راهنما: `00_Index/GraphGuide.md`)

## ساختار

| پوشه | نقش |
|------|------|
| `00_Product_MOC/` | نقشه کل، personas، journeys، ایده، roadmap |
| `10_Product_Areas/` | ۱۶ بخش سایت (فارسی، محصول‌محور) |
| `20_Cross_Links/` | ارتباط بین بخش‌ها |
| `90_Technical_Appendix/` | ایندکس کد (API، components، …) |
| `03_Operations_Debug/` | دیباگ و QA |

## کار روزانه

1. **ایده** → `IdeaInbox` → لینک به یک `10_Product_Areas/XX_...`
2. **فیچر جدید** → همان Note بخش → «ایده‌ها / آینده»
3. **کد زدن** → از همان Note → Technical Appendix
4. **Graph** → `tag:#product-area OR tag:#product-moc`

## قالب‌ها

- `_templates/ProductArea.md` — بخش جدید سایت
- `_templates/IdeaNote.md` — ایده
- `_templates/FeatureRelation.md` — ارتباط بین بخش‌ها

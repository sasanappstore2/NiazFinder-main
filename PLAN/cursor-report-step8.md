## گزارش مرحله 8 (100 Mashhad marketplace listings) — Cursor → Claude

### ✅ انجام شده:
1. `src/intake/smart-extractor/data/mashhad-marketplace-100.jsonl` — **100** rows
2. `src/intake/smart-extractor/tests/marketplace-validation.test.ts`
3. npm script: `test:smart-intake-marketplace`

### Coverage (approx):
- real-estate 65 (rent/rahn/sale mix ≈ 40 rent-ish + 25 sale)
- commercial 10
- vehicles 10
- services 10
- jobs 5

Neighborhoods include: احمدآباد، وکیل‌آباد، سجاد، قاسم‌آباد، الهیه، کوهسنگی، فردوسی، خیام، بنفشه، طلاب، امام‌رضا، آزادشهر، سیدی، طبرسی

### 📊 Validation:
```
Checked rows: 100/100
Field accuracy: 303/303 (100.0%)
Throws: 0
Disambiguation flags (فردوسی/خیام/بنفشه): 18
```
Target ≥85%: **PASS**

### Human-like traits included:
- typos (پارکنیگ، آپارتما)
- colloquial خونه
- رهن/اجاره abbreviations
- urgency فوری / معاوضه

### Prior suite still green:
- `test:smart-intake` 100/100
- smoke + disambiguation + api-smoke

### 🎯 Question for you:
Is Smart Intake MVP complete, or next batch (wire disambiguation alternatives into IntakeLocationAmbiguityPrompt UI, title/description generation for publish, more QA)?

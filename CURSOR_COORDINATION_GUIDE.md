# 📋 راهنمای هماهنگی با Cursor برای پیاده‌سازی Smart Intake

## 🎯 هدف این سند
این سند برای هماهنگی کامل بین شما، Cursor و من (Claude) تهیه شده تا پروژه Smart Intake به بهترین شکل پیاده‌سازی شود.

## 🤝 نحوه همکاری سه‌جانبه

### نقش شما (Product Owner)
- تعیین اولویت‌ها
- تایید نتایج هر مرحله
- تست نهایی و feedback

### نقش من (Claude - مدیر پروژه و معمار)
- طراحی معماری
- نوشتن specifications
- بررسی کد Cursor
- هماهنگی و گزارش‌دهی

### نقش Cursor (توسعه‌دهنده)
- پیاده‌سازی کد
- اجرای تست‌ها
- رفع باگ‌ها
- بهینه‌سازی

## 📝 دستورالعمل گام به گام برای Cursor

### Step 1: آماده‌سازی محیط (15 دقیقه)
```bash
# 1. Backup گرفتن از فایل‌های موجود
cp -r src/intake src/intake.backup.$(date +%Y%m%d)
cp -r src/components/need-intake src/components/need-intake.backup.$(date +%Y%m%d)

# 2. ایجاد branch جدید
git checkout -b feature/smart-intake-system

# 3. نصب dependencies
npm install lodash debounce string-similarity
npm install --save-dev @testing-library/react jest

# 4. ایجاد ساختار دایرکتوری‌ها
mkdir -p src/intake/smart-extractor/{rules,ai,disambiguation,validators,tests,cache,monitoring}
```

**گزارش به من:** پس از اتمام، تایید کنید که همه dependencies نصب شده و ساختار ایجاد شده.

### Step 2: پیاده‌سازی Core Engine (2 ساعت)

**فایل‌های اصلی برای ایجاد:**
1. `src/intake/smart-extractor/types.ts` - از SMART_INTAKE_IMPLEMENTATION_PLAN.md کپی کنید
2. `src/intake/smart-extractor/smart-field-extractor.ts` - کد اصلی extractor
3. `src/intake/smart-extractor/rules/advanced-rules-engine.ts` - موتور rules

**چک‌لیست پیاده‌سازی:**
- [ ] تایپ‌ها و interfaces تعریف شده
- [ ] تابع اصلی `extractSmartFields` کار می‌کند
- [ ] Rules engine حداقل 10 pattern را پشتیبانی می‌کند
- [ ] تست ساده برای متن "آپارتمان 2 خواب 100 متر در سجاد" پاس می‌شود

**تست اولیه:**
```typescript
// تست ساده برای اطمینان از عملکرد
const result = await extractSmartFields(
  "آپارتمان 2 خواب 100 متر برای اجاره در سجاد مشهد",
  "",
  { preferredCity: "مشهد" }
);

console.assert(result.property.rooms === 2);
console.assert(result.property.area === 100);
console.assert(result.location.neighborhood === "سجاد");
console.assert(result.transaction.type === "RENT");
```

**گزارش به من:** نتیجه تست و هر مشکلی که برخورد کردید.

### Step 3: پیاده‌سازی Disambiguation Engine (1.5 ساعت)

**فایل‌های مورد نیاز:**
1. `src/intake/smart-extractor/disambiguation/neighborhood-disambiguator.ts`
2. `src/components/need-intake/NeighborhoodDisambiguationModal.tsx`

**داده‌های تست برای مشهد:**
```javascript
const mashhad_neighborhoods = {
  "فردوسی": [
    { id: "1", name: "خیابان فردوسی شمالی", district: "1", landmarks: ["دانشگاه فردوسی"] },
    { id: "2", name: "خیابان فردوسی جنوبی", district: "2", landmarks: ["بیمارستان"] },
    { id: "3", name: "بلوار فردوسی", district: "3", landmarks: ["پارک ملت"] }
  ],
  "بنفشه": [
    { id: "4", name: "خیابان بنفشه - احمدآباد", district: "1" },
    { id: "5", name: "خیابان بنفشه - قاسم آباد", district: "7" }
  ],
  "خیام": [
    { id: "6", name: "خیام شمالی", district: "2" },
    { id: "7", name: "خیام جنوبی", district: "8" }
  ]
};
```

**تست disambiguation:**
```typescript
const disambiguator = new NeighborhoodDisambiguator();
const result = await disambiguator.disambiguate(
  "فردوسی",
  "مشهد",
  ["نزدیک دانشگاه"]
);

// باید فردوسی شمالی را با confidence بالا برگرداند
console.assert(result.exact?.name.includes("شمالی"));
```

**گزارش به من:** آیا disambiguation برای محله‌های مشابه کار می‌کند؟

### Step 4: اتصال به UI (2 ساعت)

**فایل‌های برای تغییر:**
1. `src/hooks/use-smart-intake.ts` - ایجاد کنید
2. `src/hooks/use-realtime-extraction.ts` - ایجاد کنید
3. `src/components/need-intake/NeedIntakePanel.tsx` - update کنید

**نکات مهم:**
- از debouncing با 300ms استفاده کنید
- فیلدها را به صورت incremental پر کنید (فقط فیلدهای خالی)
- loading state را نمایش دهید
- در صورت خطا، fallback به سیستم قدیم

**کد تست UI:**
```javascript
// در browser console
// تایپ کنید: "آپارتمان 2 خواب 100 میلیون رهن 10 میلیون اجاره در سجاد"
// انتظار: فیلدها به صورت خودکار پر شوند

// بررسی performance
console.time('extraction');
// تایپ متن
console.timeEnd('extraction');
// باید کمتر از 300ms باشد
```

**گزارش به من:** 
- آیا real-time extraction کار می‌کند؟
- زمان پاسخ چقدر است؟
- آیا disambiguation modal نمایش داده می‌شود؟

### Step 5: اجرای Test Suite (1 ساعت)

**اجرای 100 تست از SMART_INTAKE_TEST_SCENARIOS.md:**

```bash
# ایجاد test runner
npm run test:smart-intake

# یا دستی
node src/intake/smart-extractor/tests/run-all-tests.js
```

**گزارش مورد انتظار:**
```
✅ Passed: 85/100
❌ Failed: 15/100
Success Rate: 85%

Failed Categories:
- Disambiguation: 5 cases
- Budget extraction: 3 cases
- Complex text: 7 cases
```

**گزارش به من:** جدول کامل نتایج با ذکر دقیق موارد failed

### Step 6: Performance Tuning (1 ساعت)

**بررسی‌های Performance:**
```javascript
// 1. Memory usage
const memBefore = process.memoryUsage().heapUsed;
// اجرای 100 extraction
const memAfter = process.memoryUsage().heapUsed;
console.log('Memory increase:', (memAfter - memBefore) / 1024 / 1024, 'MB');

// 2. Response time
const times = [];
for (let i = 0; i < 100; i++) {
  const start = Date.now();
  await extractSmartFields(testCases[i]);
  times.push(Date.now() - start);
}
console.log('Avg time:', times.reduce((a,b) => a+b) / 100);
console.log('P95:', times.sort()[95]);
```

**Optimization checklist:**
- [ ] Caching implemented
- [ ] Unnecessary AI calls removed
- [ ] Rules optimized (regex compilation)
- [ ] Memory leaks fixed

**گزارش به من:** آیا به هدف performance رسیدیم؟ (< 200ms average)

### Step 7: Integration Testing (30 دقیقه)

**تست end-to-end:**
1. کاربر وارد صفحه /post می‌شود
2. شهر "مشهد" را انتخاب می‌کند
3. تایپ می‌کند: "آپارتمان 3 خواب 150 متر با پارکینگ و آسانسور در خیابان فردوسی نزدیک دانشگاه"
4. سیستم باید:
   - دسته‌بندی: apartment-rent
   - متراژ: 150
   - تعداد خواب: 3
   - پارکینگ: ✓
   - آسانسور: ✓
   - محله: modal برای انتخاب فردوسی (3 گزینه)
5. کاربر "فردوسی شمالی" را انتخاب می‌کند
6. فرم کامل می‌شود
7. کلیک روی ثبت
8. آگهی با موفقیت ثبت می‌شود

**گزارش به من:** آیا تمام مراحل بدون خطا انجام شد؟

### Step 8: رفع باگ‌ها (زمان متغیر)

**باگ‌های احتمالی:**
1. **Regex conflicts:** برخی pattern ها ممکن است تداخل داشته باشند
   - Solution: اولویت‌بندی rules
   
2. **Memory leak در cache:** 
   - Solution: پیاده‌سازی LRU eviction
   
3. **Race condition در real-time:**
   - Solution: استفاده از AbortController

4. **Disambiguation برای شهرهای دیگر:**
   - Solution: بارگذاری dynamic data

**برای هر باگ:**
1. شناسایی root cause
2. نوشتن test case
3. رفع باگ
4. تایید با تست
5. گزارش به من

### Step 9: Documentation (30 دقیقه)

**مستندات مورد نیاز:**
1. **API Documentation:**
   ```typescript
   /**
    * Smart Field Extractor API
    * 
    * Endpoint: POST /api/intake/smart-extract
    * 
    * Request:
    * {
    *   needText: string,
    *   detailsText?: string,
    *   options?: {
    *     preferredCity?: string,
    *     preferredCitySlug?: string,
    *     useAI?: boolean,
    *     realTime?: boolean
    *   }
    * }
    * 
    * Response: SmartExtractionResult
    */
   ```

2. **Component Documentation:**
   - Props و usage برای هر component
   - Examples

3. **Migration Guide:**
   - چگونه از سیستم قدیم به جدید migrate کنیم
   - Breaking changes
   - Fallback strategy

**گزارش به من:** لینک به مستندات تولید شده

### Step 10: Deploy to Staging (30 دقیقه)

**Pre-deployment checklist:**
- [ ] All tests passing
- [ ] Performance metrics met
- [ ] No console errors
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] Backup plan ready

**Deployment steps:**
```bash
# 1. Merge to develop
git checkout develop
git merge feature/smart-intake-system

# 2. Build
npm run build

# 3. Run smoke tests
npm run test:smoke

# 4. Deploy to staging
npm run deploy:staging
```

**گزارش به من:** لینک staging و نتیجه smoke tests

## 🔄 چرخه Feedback

### بعد از هر مرحله:
1. **Cursor** نتیجه را به من گزارش می‌دهد
2. **من** بررسی و تایید می‌کنم
3. **شما** تست نهایی انجام می‌دهید
4. **تصمیم** برای ادامه یا اصلاح

### فرمت گزارش Cursor به من:
```markdown
## گزارش مرحله X

### ✅ انجام شده:
- آیتم 1
- آیتم 2

### ⚠️ مشکلات:
- مشکل 1: [توضیح]
  - Solution: [راه حل پیشنهادی]

### 📊 Metrics:
- Test pass rate: X%
- Avg response time: Xms
- Memory usage: XMB

### 🎯 Next steps:
- گام بعدی
```

## 📞 نقاط تماس

### زمان‌هایی که نیاز به تایید من دارید:
1. قبل از تغییرات breaking
2. وقتی performance target نمی‌رسد
3. اگر تست‌ها بیش از 20% fail شوند
4. قبل از deploy به production

### زمان‌هایی که نیاز به تایید شما دارید:
1. تایید UX تغییرات
2. تایید business logic
3. Go/No-Go برای production

## 🚀 Timeline پیشنهادی

| مرحله | زمان تخمینی | Deadline |
|--------|-------------|----------|
| Setup | 15 دقیقه | امروز |
| Core Engine | 2 ساعت | امروز |
| Disambiguation | 1.5 ساعت | امروز |
| UI Integration | 2 ساعت | امروز |
| Testing | 1 ساعت | فردا |
| Bug Fixes | 2 ساعت | فردا |
| Staging | 30 دقیقه | فردا |
| Production | 30 دقیقه | پس‌فردا |

## ✅ معیارهای Success

### Technical Success:
- [ ] 95% field extraction accuracy
- [ ] < 200ms response time
- [ ] Zero runtime errors
- [ ] 100% test coverage

### Business Success:
- [ ] 80% کاهش در زمان ثبت آگهی
- [ ] 50% افزایش در تکمیل فرم‌ها
- [ ] 90% رضایت کاربر

## 🎯 نکته نهایی برای Cursor

**اولویت‌بندی:**
1. **First:** عملکرد صحیح برای موارد ساده
2. **Second:** پوشش edge cases
3. **Third:** بهینه‌سازی performance
4. **Fourth:** افزودن features اضافی

**قانون طلایی:**
> "Ship small, ship often, get feedback early"

هر 2 ساعت یکبار پیشرفت را گزارش کنید، حتی اگر ناقص باشد.

---

**Cursor، این سند راهنمای شماست. از Step 1 شروع کنید و نتیجه هر مرحله را به من گزارش دهید. من منتظر اولین گزارش شما هستم!**
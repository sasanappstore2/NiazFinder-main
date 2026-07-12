# 🧪 سناریوهای تست کامل Smart Intake System

## 📝 100 نمونه نیاز واقعی برای تست

### دسته 1: آپارتمان اجاره (20 مورد)

1. **تست محله‌های مشابه مشهد**
   ```
   نیاز: "آپارتمان 2 خواب برای اجاره در خیابان فردوسی"
   شهر انتخابی: مشهد
   نتیجه مورد انتظار:
   - نمایش disambiguation modal با 3 فردوسی (فردوسی شمالی، فردوسی جنوبی، بلوار فردوسی)
   - دسته‌بندی: apartment-rent
   - نوع معامله: RENT
   ```

2. **رهن و اجاره ترکیبی**
   ```
   نیاز: "خونه 3 خواب 100 میلیون رهن 15 میلیون اجاره نزدیک دانشگاه فردوسی مشهد"
   نتیجه مورد انتظار:
   - depositAmount: 100,000,000
   - rentAmount: 15,000,000
   - transactionType: DEPOSIT_AND_RENT
   - neighborhood: احمدآباد (نزدیک دانشگاه)
   ```

3. **رهن کامل**
   ```
   نیاز: "آپارتمان رهن کامل 800 میلیون تومان در وکیل آباد"
   نتیجه مورد انتظار:
   - depositAmount: 800,000,000
   - transactionType: FULL_DEPOSIT
   - neighborhood: وکیل‌آباد
   ```

4. **با متراژ و امکانات**
   ```
   نیاز: "اجاره آپارتمان 120 متر 2 خواب با پارکینگ و آسانسور در سجاد"
   نتیجه مورد انتظار:
   - area: 120
   - rooms: 2
   - hasParking: true
   - hasElevator: true
   - neighborhood: سجاد
   ```

5. **بودجه با "تا"**
   ```
   نیاز: "آپارتمان اجاره تا 10 میلیون تومان ماهانه در قاسم آباد"
   نتیجه مورد انتظار:
   - budgetMax: 10,000,000
   - budgetMin: null
   - transactionType: RENT
   ```

6. **طبقه مشخص**
   ```
   نیاز: "آپارتمان طبقه 3 از 5 طبقه برای اجاره در الهیه مشهد"
   نتیجه مورد انتظار:
   - floor: 3
   - totalFloors: 5
   - neighborhood: الهیه
   ```

7. **سن بنا**
   ```
   نیاز: "اجاره آپارتمان نوساز یا حداکثر 5 سال ساخت در کوهسنگی"
   نتیجه مورد انتظار:
   - age: 5
   - neighborhood: کوهسنگی
   ```

8. **فوری**
   ```
   نیاز: "فوری نیاز به آپارتمان 1 خواب اجاره در مرکز شهر"
   نتیجه مورد انتظار:
   - urgency: immediate
   - rooms: 1
   - transactionType: RENT
   ```

9. **محله خیام (ابهام)**
   ```
   نیاز: "واحد اداری برای مزون میخوام حاشیه خیام اجاره کنم"
   شهر: مشهد
   نتیجه مورد انتظار:
   - category: office
   - نمایش disambiguation برای خیام (خیام شمالی/جنوبی)
   - transactionType: RENT
   ```

10. **بلوار بنفشه (محله مشابه)**
    ```
    نیاز: "آپارتمان 90 متری خیابان بنفشه برای اجاره"
    شهر: مشهد
    نتیجه مورد انتظار:
    - نمایش چند خیابان بنفشه در مناطق مختلف
    - area: 90
    ```

### دسته 2: آپارتمان خرید (15 مورد)

11. **خرید با بودجه مشخص**
    ```
    نیاز: "خرید آپارتمان 2 خواب با بودجه 3 میلیارد در نیاوران"
    نتیجه مورد انتظار:
    - budgetMax: 3,000,000,000
    - rooms: 2
    - transactionType: BUY
    - city: تهران
    - neighborhood: نیاوران
    ```

12. **خرید با بازه قیمت**
    ```
    نیاز: "آپارتمان برای خرید بین 2 تا 4 میلیارد در سعادت آباد"
    نتیجه مورد انتظار:
    - budgetMin: 2,000,000,000
    - budgetMax: 4,000,000,000
    - neighborhood: سعادت‌آباد
    ```

13. **لوکس با امکانات کامل**
    ```
    نیاز: "خرید آپارتمان لوکس 200 متر با استخر و سونا در زعفرانیه"
    نتیجه مورد انتظار:
    - area: 200
    - hasPool: true
    - hasSauna: true
    - neighborhood: زعفرانیه
    ```

14. **پنت هاوس**
    ```
    نیاز: "دنبال پنت هاوس برای خرید در الهیه تهران هستم"
    نتیجه مورد انتظار:
    - category: penthouse
    - transactionType: BUY
    - neighborhood: الهیه
    ```

15. **سوئیت**
    ```
    نیاز: "سوئیت 50 متری برای خرید در مرزداران"
    نتیجه مورد انتظار:
    - category: suite
    - area: 50
    - neighborhood: مرزداران
    ```

### دسته 3: ویلا (10 مورد)

16. **ویلا شمال**
    ```
    نیاز: "ویلا برای خرید در رامسر با ویو دریا"
    نتیجه مورد انتظار:
    - category: villa
    - city: رامسر
    - hasSeaView: true
    - transactionType: BUY
    ```

17. **ویلا با متراژ زمین**
    ```
    نیاز: "ویلا 300 متر بنا در 500 متر زمین در کردان"
    نتیجه مورد انتظار:
    - category: villa
    - area: 300
    - landArea: 500
    - city: کردان
    ```

18. **باغ ویلا**
    ```
    نیاز: "باغ ویلا 1000 متر با درختان میوه در شهریار"
    نتیجه مورد انتظار:
    - category: garden-villa
    - landArea: 1000
    - city: شهریار
    ```

### دسته 4: تجاری (15 مورد)

19. **مغازه با بَر مشخص**
    ```
    نیاز: "مغازه 50 متر با 6 متر بَر برای اجاره در بازار رضا"
    شهر: مشهد
    نتیجه مورد انتظار:
    - category: shop
    - area: 50
    - frontage: 6
    - neighborhood: بازار رضا
    ```

20. **دفتر کار**
    ```
    نیاز: "دفتر 100 متری طبقه دوم برای اجاره در ونک"
    نتیجه مورد انتظار:
    - category: office
    - area: 100
    - floor: 2
    - neighborhood: ونک
    ```

21. **انبار**
    ```
    نیاز: "انبار 200 متر با رمپ تخلیه در شهرک صنعتی توس"
    نتیجه مورد انتظار:
    - category: warehouse
    - area: 200
    - hasLoadingRamp: true
    - neighborhood: شهرک صنعتی توس
    ```

22. **کارگاه**
    ```
    نیاز: "کارگاه 500 متر با برق صنعتی در خاوران"
    نتیجه مورد انتظار:
    - category: workshop
    - area: 500
    - hasIndustrialPower: true
    - neighborhood: خاوران
    ```

23. **رستوران**
    ```
    نیاز: "جای آماده برای رستوران با پروانه کسب در جردن"
    نتیجه مورد انتظار:
    - category: restaurant
    - hasBusinessLicense: true
    - neighborhood: جردن
    ```

### دسته 5: زمین (10 مورد)

24. **زمین مسکونی**
    ```
    نیاز: "زمین 300 متری برای ساخت در شهرک غرب"
    نتیجه مورد انتظار:
    - category: land-residential
    - area: 300
    - neighborhood: شهرک غرب
    - transactionType: BUY
    ```

25. **زمین تجاری**
    ```
    نیاز: "زمین تجاری گوشه دو کوچه 150 متر در ستارخان"
    نتیجه مورد انتظار:
    - category: land-commercial
    - area: 150
    - isCorner: true
    - neighborhood: ستارخان
    ```

26. **زمین کشاورزی**
    ```
    نیاز: "زمین کشاورزی 2 هکتار با آب در ورامین"
    نتیجه مورد انتظار:
    - category: land-agricultural
    - area: 20000  // 2 هکتار
    - hasWater: true
    - city: ورامین
    ```

### دسته 6: موارد پیچیده و ترکیبی (20 مورد)

27. **متن طولانی با جزئیات**
    ```
    نیاز: "سلام من دنبال یک آپارتمان هستم برای خانواده 4 نفره. 3 خواب میخواهیم ترجیحا 
    120 تا 150 متر. بودجه ما برای رهن حدود 200 میلیون و اجاره ماهانه 8 میلیون هست. 
    منطقه وکیل آباد یا الهیه مشهد مد نظرمون هست. حتما پارکینگ داشته باشه و اگر انباری 
    هم داشته باشه عالی میشه. طبقات بالا رو ترجیح میدیم."
    
    نتیجه مورد انتظار:
    - rooms: 3
    - area: 135 (میانگین)
    - depositAmount: 200,000,000
    - rentAmount: 8,000,000
    - neighborhoods: [وکیل‌آباد، الهیه]
    - hasParking: true
    - hasStorage: true
    - floorPreference: high
    ```

28. **املاک مشابه در مناطق مختلف**
    ```
    نیاز: "آپارتمان 80 متری 2 خواب در احمدآباد یا قاسم آباد یا سجاد"
    نتیجه مورد انتظار:
    - area: 80
    - rooms: 2
    - neighborhoods: [احمدآباد، قاسم‌آباد، سجاد]
    ```

29. **عبارات محاوره‌ای**
    ```
    نیاز: "یه خونه کوچیک میخوام تو حدود 60-70 متر واسه زوج جوان قیمتشم مناسب باشه"
    نتیجه مورد انتظار:
    - area: 65 (میانگین)
    - rooms: 1 یا 2
    - targetGroup: young-couple
    - priceRange: affordable
    ```

30. **ترکیب فارسی و اعداد انگلیسی**
    ```
    نیاز: "آپارتمان 2bedroom مساحت 95m2 در فاز 2 پردیس"
    نتیجه مورد انتظار:
    - rooms: 2
    - area: 95
    - neighborhood: فاز 2 پردیس
    ```

31. **اشتباهات تایپی**
    ```
    نیاز: "اپارتمان ۳خواب دروکیل اباد مشهد برای اجاره"
    نتیجه مورد انتظار:
    - تصحیح: آپارتمان، وکیل‌آباد
    - rooms: 3
    - neighborhood: وکیل‌آباد
    - transactionType: RENT
    ```

### دسته 7: Edge Cases خاص (10 مورد)

32. **فقط محله بدون شهر**
    ```
    نیاز: "خونه در امامت میخوام"
    نتیجه مورد انتظار:
    - تشخیص امامت مشهد (اگر قبلا مشهد انتخاب شده)
    - یا نمایش لیست شهرهایی که محله امامت دارند
    ```

33. **قیمت‌های نامتعارف**
    ```
    نیاز: "آپارتمان با 10 تومن اجاره"
    نتیجه مورد انتظار:
    - تشخیص خطا در مبلغ
    - درخواست تصحیح از کاربر
    ```

34. **متن کاملا انگلیسی**
    ```
    نیاز: "2 bedroom apartment for rent in Tehran"
    نتیجه مورد انتظار:
    - rooms: 2
    - transactionType: RENT
    - city: تهران
    ```

35. **بدون هیچ جزئیات**
    ```
    نیاز: "خونه میخوام"
    نتیجه مورد انتظار:
    - نمایش فرم با سوالات هدایت‌شده
    - suggestions: ["نوع ملک؟", "خرید یا اجاره؟", "در کدام شهر؟"]
    ```

36. **متن بسیار کوتاه**
    ```
    نیاز: "سجاد"
    نتیجه مورد انتظار:
    - تشخیص احتمالی محله سجاد
    - درخواست اطلاعات بیشتر
    ```

### دسته 8: تست Performance (10 مورد)

37-46. **متن‌های بسیار طولانی (بیش از 500 کلمه)**
    - تست سرعت extraction
    - تست دقت با noise زیاد
    - تست memory usage

### دسته 9: تست Localization (10 مورد)

47-56. **شهرهای مختلف ایران**
    - تهران، مشهد، اصفهان، شیراز، تبریز
    - کرج، قم، اهواز، کرمانشاه، ارومیه

### دسته 10: تست User Experience (10 مورد)

57-66. **سناریوهای واقعی کاربران**
    - کاربر مبتدی
    - کاربر حرفه‌ای (مشاور املاک)
    - کاربر خارجی
    - کاربر با نیازهای خاص

### دسته 11: تست Integration (10 مورد)

67-76. **تست با سیستم‌های دیگر**
    - ارتباط با نقشه
    - ارتباط با سیستم پرداخت
    - ارتباط با چت
    - ارتباط با سیستم notification

### دسته 12: تست Error Recovery (8 مورد)

77-84. **مدیریت خطاها**
    - API timeout
    - Invalid data
    - Network failure
    - Concurrent requests

### دسته 13: تست Security (8 مورد)

85-92. **امنیت و Validation**
    - SQL injection attempts
    - XSS attempts
    - Large payload attacks
    - Rate limiting tests

### دسته 14: تست Regression (8 مورد)

93-100. **تست‌های بازگشتی**
    - موارد قبلا شکست خورده
    - Edge cases تاریخی
    - Bug های رفع شده

## 🔧 نحوه اجرای تست‌ها

### Automated Testing Script
```typescript
// فایل: src/intake/smart-extractor/tests/run-all-tests.ts

import { TestRunner } from './test-runner';
import { testScenarios } from './scenarios';

async function runAllTests() {
  const runner = new TestRunner();
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  for (const scenario of testScenarios) {
    try {
      const result = await runner.run(scenario);
      
      if (result.passed) {
        results.passed++;
        console.log(`✅ Test ${scenario.id}: ${scenario.description}`);
      } else {
        results.failed++;
        results.errors.push({
          id: scenario.id,
          expected: scenario.expected,
          actual: result.actual,
          diff: result.diff
        });
        console.log(`❌ Test ${scenario.id}: ${scenario.description}`);
      }
    } catch (error) {
      console.error(`💥 Test ${scenario.id} crashed:`, error);
      results.failed++;
    }
  }

  // گزارش نهایی
  console.log('\n📊 Test Results:');
  console.log(`Passed: ${results.passed}/${testScenarios.length}`);
  console.log(`Failed: ${results.failed}/${testScenarios.length}`);
  console.log(`Success Rate: ${(results.passed / testScenarios.length * 100).toFixed(2)}%`);

  // ذخیره گزارش
  await saveReport(results);

  return results;
}
```

### Manual Testing Checklist
```markdown
## چک‌لیست تست دستی

### تست Real-time Extraction
- [ ] تایپ کردن نیاز و مشاهده پر شدن فیلدها
- [ ] تغییر شهر و مشاهده update محله‌ها
- [ ] اضافه کردن جزئیات و مشاهده بهبود دقت

### تست Disambiguation
- [ ] وارد کردن "خیابان فردوسی" در مشهد
- [ ] انتخاب از modal و تایید صحت
- [ ] تست با محله‌های مشابه دیگر

### تست Transaction Detection
- [ ] "100 میلیون رهن 10 میلیون اجاره"
- [ ] "رهن کامل 500 میلیون"
- [ ] "اجاره ماهانه 5 میلیون"

### تست Performance
- [ ] زمان پاسخ < 200ms
- [ ] بدون lag در UI
- [ ] مصرف حافظه < 50MB
```

## 📈 معیارهای موفقیت

### Accuracy Metrics
```javascript
const metrics = {
  categoryAccuracy: 0.95,      // دقت تشخیص دسته‌بندی
  locationAccuracy: 0.92,       // دقت تشخیص محله
  transactionAccuracy: 0.98,    // دقت تشخیص نوع معامله
  budgetAccuracy: 0.90,         // دقت استخراج بودجه
  propertyAccuracy: 0.88,       // دقت ویژگی‌های ملک
  overallAccuracy: 0.93         // دقت کلی
};
```

### Performance Metrics
```javascript
const performance = {
  avgExtractionTime: 150,       // ms
  p95ExtractionTime: 300,       // ms
  p99ExtractionTime: 500,       // ms
  cacheHitRate: 0.60,          // 60% cache hit
  errorRate: 0.001             // 0.1% error
};
```

## 🎯 نتیجه‌گیری

این 100 تست کیس به گونه‌ای طراحی شده که:
1. **تمام حالات ممکن** را پوشش دهد
2. **مشکلات واقعی** کاربران را شبیه‌سازی کند
3. **Edge cases** را شناسایی کند
4. **Performance** سیستم را بسنجد
5. **کیفیت UX** را تضمین کند

**برای Cursor:**
این تست‌ها را به صورت automated اجرا کنید و نتایج را در قالب گزارش HTML با چارت‌های تحلیلی ارائه دهید.
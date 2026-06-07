# گزارش Benchmark — دسته‌بندی املاک

تاریخ: 2026-06-06

## نتیجه کلی
- Benchmark: **97.1%**
- تعداد نمونه: 155
- خطا: 3
- Parser: LLM + rules reconcile

## نتایج به تفکیک دسته
| دسته | تعداد | درصد | خطا |
|------|-------|------|-----|
| A | 15 | 100% | 0 |
| B | 20 | 98.3% | 0 |
| C | 20 | 98.5% | 0 |
| D | 15 | 98.6% | 0 |
| E | 20 | 99.6% | 0 |
| F | 20 | 96.1% | 1 |
| G | 20 | 99% | 0 |
| H | 15 | 96.5% | 0 |
| I | 10 | 80% | 2 |

## نتایج به تفکیک فیلد
| فیلد | درصد |
|------|------|
| intent | 98.1% |
| property_type | 98.1% |
| location_city | 98.7% |
| location_neighborhood | 98.7% |
| clarifications_asked_correctly | 91.8% |
| budget | 96.8% |
| area | 98.1% |
| rooms | 98.7% |
| features | 98.1% |

## خطاهای باقی‌مانده (نمونه)

### F-02 (F) — 68%
> خونه می‌خوام. ۵۰۰ تومن دارم

- intent: expected "buy", got rent
- budget: budget match 0/1

### I-03 (I) — 0%
> دنبال مکانیک هستم

- category: expected out_of_scope, got estate

### I-06 (I) — 0%
> سفر کیش ارزون

- category: expected out_of_scope, got estate

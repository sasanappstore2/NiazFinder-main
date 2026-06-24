# NiazFinder OpenClaw Intake Agent

## نصب و راه‌اندازی

### ۱. پیش‌نیازها

- سرویس `gemma4-intake` روی پورت 8100 در حال اجرا باشد
- مدل `gemma-4-E2B_q4_0-it.gguf` در `models/GEMMA/` موجود باشد

```bash
# اجرای سرویس LLM
docker compose --profile ai up -d gemma4-intake

# یا به صورت مستقیم
cd mini-services/gemma4-intake && python -m uvicorn app.main:app --port 8100
```

### ۲. فعال‌سازی در پروژه

در فایل `.env.local`:

```env
# فعال‌سازی OpenClaw intake agent
OPENCLAW_INTAKE_AGENT_ENABLED=true
NEED_INTAKE_LLM_ENABLED=true
NEED_INTAKE_LLM_URL=http://127.0.0.1:8100
NEED_INTAKE_LLM_MODEL=gemma-4-e2b-q4_0-it

# غیرفعال کردن مسیرهای قدیمی
NEED_INTAKE_HYBRID_ENABLED=false
NEED_INTAKE_PROPOSE_VALIDATE_ENABLED=false
```

### ۳. نصب به عنوان OpenClaw Skill

برای استفاده از این skill در OpenClaw:

```bash
# کپی skill به مسیر skills های OpenClaw
cp -r openclaw/ ~/.openclaw-autoclaw/skills/niazfinder-intake/
```

سپس در `openclaw.config.yaml` (یا پیکربندی agent):

```yaml
skills:
  - niazfinder-intake
```

## ساختار فایل‌ها

```
openclaw/
├── SKILL.md              # تعریف skill برای OpenClaw
├── system-prompt.md      # پرامپت سیستم کامل برای مدل LLM
├── prompt-template.md    # قالب پرامپت کاربر با placeholder ها
├── categories.json       # ۱۰۷ دسته‌بندی مجاز (leaf + orphan depth-1)
├── intake-fields.json    # تعریف تمام فیلدهای intake با نوع و مقادیر مجاز
├── vertical-schemas.json # فیلدهای مورد انتظار به ازاء هر vertical + نمونه
├── examples.json         # ۸ نمونه ورودی/خروجی برای آموزش و تست
├── cities.json           # فهرست شهرهای ایران (تولید شده از DB)
└── README.md             # این فایل
```

## نحوه کار

1. کاربر متن نیاز را در `/post` وارد می‌کند
2. API `/api/intake/analyze` صدا می‌شود
3. `runIntakeIntelligence()` بررسی می‌کند که آیا `OPENCLAW_INTAKE_AGENT_ENABLED=true` است
4. اگر بله: `runOpenClawIntakeAgent()` اجرا می‌شود
   - Context ساخته می‌شود (categories + cities + neighborhoods)
   - System prompt + user prompt به gemma4-intake ارسال می‌شود
   - پاسخ JSON پارس می‌شود
   - فیلدها به `IntakeFieldBag` مپ می‌شوند
5. Validators موجود اعتبارسنجی می‌کنند
6. اگر OpenClaw fail کرد → fallback به hybrid pipeline

## تولید cities.json

برای تولید فایل شهرها از دیتابیس:

```bash
npx tsx -e "
import { prisma } from './src/lib/db';
const cities = await prisma.intakeCity.findMany({
  where: { isActive: true },
  select: { slug: true, name: true },
  include: { province: { select: { name: true, slug: true } } }
});
const result = cities.map(c => ({ slug: c.slug, name: c.name, province: c.province.name, provinceSlug: c.province.slug }));
require('fs').writeFileSync('openclaw/cities.json', JSON.stringify(result, null, 2));
console.log('cities.json written: ' + result.length + ' cities');
await prisma.\$disconnect();
"
```

## تست

```bash
# تست با متن نمونه
npx tsx -e "
import { runOpenClawIntakeAgent } from './src/intake/openclaw-agent';
const result = await runOpenClawIntakeAgent({
  text: 'آپارتمان ۷۰ متری دو خواب در سعادت‌آباد تهران، رهن کامل ۵۰۰ میلیون',
  cityName: 'تهران',
  citySlug: 'tehran',
});
console.log(JSON.stringify(result, null, 2));
"
```

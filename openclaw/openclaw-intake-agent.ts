/**
 * OpenClaw Intake Agent — جایگزین هوشمند برای LLM-based intake parsing.
 *
 * متن فارسی نیاز کاربر را می‌خواند، با context کامل (دسته‌بندی‌ها + شهرها + محله‌ها)
 * به Gemma 4 2B ارسال می‌کند، و تمام فیلدهای intake را به صورت JSON دریافت می‌کند.
 *
 * سپس validators موجود مقادیر را اعتبارسنجی می‌کنند.
 */
import 'server-only';

import { localChatCompletions } from '@/lib/need-intake/local-chat-client';
import { buildLeafCatalogLines } from '@/intake/intelligence-engine/propose-validate/propose-prompt';
import { parseAiJsonPayload } from '@/ai/schema/extractionSchema';
import { prisma } from '@/lib/db';
import {
  createEmptyFieldBag,
  setField,
  type IntakeFieldBag,
  type IntakeIntelligenceInput,
} from '@/intake/intelligence-engine/types';

// ─── Types ───

export interface OpenClawIntakeResult {
  fields: IntakeFieldBag;
  summary: string;
  confidence: number;
  missingInfo: string[];
  raw: Record<string, unknown>;
  latencyMs: number;
  provider: string;
}

// ─── System Prompt ───

const SYSTEM_PROMPT = `تو ایجنت هوشمند نیازفایندری هستی. وظیفه تو خواندن متن نیاز کاربر (به زبان فارسی) و پر کردن کامل فرم intake است.

قوانین:
۱. فقط JSON معتبر برگردان — بدون markdown، بدون توضیح، بدون کد بلاک
۲. دسته‌بندی‌ها را فقط از فهرست مجاز (که در context آمده) انتخاب کن — هرگز slug جدید نساز
۳. شهر و محله را دقیقاً همان‌طور که کاربر نوشته برگردان — اعتبارسنجی بعداً انجام می‌شود
۴. اگر فیلدی در متن نبود، null بگذار — حدس نزن
۵. اعداد فارسی/عربی را به عدد انگلیسی تبدیل کن: «۵۰۰ میلیون» → 500000000
۶. واحد پول همیشه تومان است، مگر اینکه صراحتاً «ریال» ذکر شده باشد
۷. متن‌های فارسی را عادی‌سازی کن: ی ↔ ی، ک ↔ ک

مقادیر مجاز transactionType: BUY, RENT, FULL_DEPOSIT, DEPOSIT_AND_RENT, DAILY_RENT, HOURLY_RENT, SELL
مقادیر مجاز propertyKind: apartment, villa, land, shop, office, industrial

منطق استخراج املاک:
- «رهن کامل» یا «پیش‌فروش کامل» → FULL_DEPOSIT
- «رهن و اجاره» → DEPOSIT_AND_RENT
- «اجاره» یا «اجاره ماهانه» → RENT
- «خرید» → BUY
- «فروش» → SELL
- «اجاره روزانه» → DAILY_RENT
- rahnAmount = مبلغ رهن، monthlyRent = اجاره ماهانه
- area = متراژ، rooms = تعداد اتاق خواب

عددخوانی:
- «۵۰۰ میلیون» → 500000000
- «۲ میلیارد» → 2000000000
- «۵۰ هزار» → 50000
- «دو خواب» → rooms: 2
- «۷۰ متر» → area: 70

خروجی JSON:
{
  "vertical": "string",
  "categorySlug": "string|null",
  "subcategorySlug": "string|null",
  "transactionType": "BUY|RENT|FULL_DEPOSIT|DEPOSIT_AND_RENT|DAILY_RENT|HOURLY_RENT|SELL|null",
  "dealType": "string|null",
  "city": "string|null",
  "citySlug": "string|null",
  "province": "string|null",
  "neighborhood": "string|null",
  "neighborhoodSlug": "string|null",
  "area": "number|null",
  "rooms": "number|null",
  "budgetMin": "number|null",
  "budgetMax": "number|null",
  "rahnAmount": "number|null",
  "monthlyRent": "number|null",
  "deposit": "number|null",
  "propertyKind": "string|null",
  "floorMin": "number|null",
  "yearMin": "number|null",
  "summary": "خلاصه یک‌جمله‌ای نیاز به فارسی",
  "confidence": 0.0,
  "missingInfo": []
}`;

// ─── Context Builders ───

async function getNeighborhoodsForCity(
  citySlug: string | null | undefined
): Promise<{ slug: string; name: string }[]> {
  if (!citySlug) return [];
  try {
    const city = await prisma.intakeCity.findUnique({
      where: { slug: citySlug },
      include: {
        neighborhoods: {
          where: { isActive: true },
          select: { slug: true, name: true },
        },
      },
    });
    return city?.neighborhoods ?? [];
  } catch {
    return [];
  }
}

function buildUserPrompt(opts: {
  text: string;
  cityName?: string | null;
  citySlug?: string | null;
  leafLines: string;
  neighborhoods: { slug: string; name: string }[];
}): string {
  const hoodLines =
    opts.neighborhoods.length > 0
      ? opts.neighborhoods.map((n) => `${n.slug}\t${n.name}`).join('\n')
      : '(شهر انتخابی مشخص نیست — محله‌ها را از متن استخراج کن)';

  const cityLine = opts.cityName
    ? `شهر انتخابی کاربر: ${opts.cityName}`
    : 'شهر انتخابی کاربر: نامشخص (از متن استخراج کن)';

  return `متن نیاز:
"""
${opts.text}
"""

${cityLine}

## فهرست دسته‌بندی‌های مجاز (slug \t عنوان کامل):
${opts.leafLines}

## محله‌های ${opts.cityName ?? 'شهر'} (slug \t نام):
${hoodLines}

این JSON را پر کن:`;
}

// ─── Field Mapping ───

function mapToFieldBag(parsed: Record<string, unknown>): IntakeFieldBag {
  const bag = createEmptyFieldBag();
  const r = parsed;

  if (r.vertical) {
    setField(bag, 'vertical', { value: r.vertical as string, confidence: 0.85, source: 'ai' });
  }
  if (r.categorySlug) {
    setField(bag, 'categorySlug', { value: r.categorySlug as string, confidence: 0.8, source: 'ai' });
  }
  if (r.subcategorySlug) {
    setField(bag, 'subcategorySlug', { value: r.subcategorySlug as string, confidence: 0.8, source: 'ai' });
  }
  if (r.transactionType) {
    setField(bag, 'transactionType', { value: r.transactionType, confidence: 0.85, source: 'ai' });
  }
  if (r.dealType) {
    setField(bag, 'dealType', { value: r.dealType as string, confidence: 0.8, source: 'ai' });
  }
  if (r.city) {
    setField(bag, 'city', { value: r.city as string, confidence: 0.8, source: 'ai' });
  }
  if (r.citySlug) {
    setField(bag, 'citySlug', { value: r.citySlug as string, confidence: 0.75, source: 'ai' });
  }
  if (r.province) {
    setField(bag, 'province', { value: r.province as string, confidence: 0.75, source: 'ai' });
  }
  if (r.neighborhood) {
    setField(bag, 'neighborhood', { value: r.neighborhood as string, confidence: 0.75, source: 'ai' });
  }
  if (r.neighborhoodSlug) {
    setField(bag, 'neighborhoodSlug', { value: r.neighborhoodSlug as string, confidence: 0.7, source: 'ai' });
  }
  if (r.area != null) {
    setField(bag, 'area', { value: Number(r.area), confidence: 0.85, source: 'ai' });
  }
  if (r.rooms != null) {
    setField(bag, 'rooms', { value: Number(r.rooms), confidence: 0.85, source: 'ai' });
  }
  if (r.budgetMin != null) {
    setField(bag, 'budgetMin', { value: Number(r.budgetMin), confidence: 0.8, source: 'ai' });
  }
  if (r.budgetMax != null) {
    setField(bag, 'budgetMax', { value: Number(r.budgetMax), confidence: 0.8, source: 'ai' });
  }
  if (r.rahnAmount != null) {
    setField(bag, 'rahnAmount', { value: Number(r.rahnAmount), confidence: 0.8, source: 'ai' });
  }
  if (r.monthlyRent != null) {
    setField(bag, 'monthlyRent', { value: Number(r.monthlyRent), confidence: 0.8, source: 'ai' });
  }
  if (r.deposit != null) {
    setField(bag, 'deposit', { value: Number(r.deposit), confidence: 0.8, source: 'ai' });
  }
  if (r.propertyKind) {
    setField(bag, 'propertyKind', { value: r.propertyKind as string, confidence: 0.8, source: 'ai' });
  }
  if (r.floorMin != null) {
    setField(bag, 'floorMin', { value: Number(r.floorMin), confidence: 0.8, source: 'ai' });
  }
  if (r.yearMin != null) {
    setField(bag, 'yearMin', { value: Number(r.yearMin), confidence: 0.8, source: 'ai' });
  }

  return bag;
}

// ─── Main Agent Function ───

export async function runOpenClawIntakeAgent(
  input: IntakeIntelligenceInput
): Promise<OpenClawIntakeResult | null> {
  const text = input.text.trim();
  if (text.length < 3) return null;

  // 1. Build context
  const leafLines = buildLeafCatalogLines();
  const neighborhoods = await getNeighborhoodsForCity(input.citySlug);

  const userPrompt = buildUserPrompt({
    text,
    cityName: input.cityName,
    citySlug: input.citySlug,
    leafLines,
    neighborhoods,
  });

  // 2. Call LLM (via existing local-chat-client → gemma4-intake service)
  const started = performance.now();
  const chat = await localChatCompletions(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    { maxTokens: 1024, temperature: 0.1, maxRetries: 1 }
  );

  const latencyMs = Math.round(performance.now() - started);

  if (!chat?.content) return null;

  // 3. Parse JSON response
  const parsed = parseAiJsonPayload(chat.content);
  if (!parsed || typeof parsed !== 'object') return null;

  const r = parsed as Record<string, unknown>;

  // 4. Map to IntakeFieldBag
  const fields = mapToFieldBag(r);

  return {
    fields,
    summary: String(r.summary ?? ''),
    confidence: Number(r.confidence ?? 0.5),
    missingInfo: Array.isArray(r.missingInfo) ? (r.missingInfo as string[]) : [],
    raw: r,
    latencyMs,
    provider: 'openclaw-gemma4',
  };
}

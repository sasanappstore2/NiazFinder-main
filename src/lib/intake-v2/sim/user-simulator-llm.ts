import type { FieldOption } from '@/contracts/need-intake';
import type { IntakeV2TurnResult } from '@/lib/intake-v2/orchestrate-turn';
import type { ConversationPersona } from '@/lib/intake-v2/sim/persona-matrix';
import {
  checkQwenIntakeHealth,
  getNeedIntakeLlmBaseUrl,
} from '@/lib/need-intake/qwen-intake-client';
import { PROPERTY_DEAL_LABELS } from '@/config/need-schemas/labels';

export interface UserSimContext {
  persona: ConversationPersona;
  turnIndex: number;
  lastAssistantMessage: string;
  activeFieldKey: string | null;
  activeFieldLabel: string | null;
  suggestedChips: FieldOption[];
  isFirstTurn: boolean;
}

export interface UserSimResult {
  message: string;
  chipFieldKey?: string;
  chipValue?: string;
  source: 'llm' | 'template' | 'chip';
}

const USER_SYSTEM_PROMPT = `شما یک کاربر ایرانی واقعی هستید که در حال ثبت نیاز ملکی در یک سایت هستید.
قوانین:
- فقط یک جمله فارسی کوتاه بنویسید (حداکثر ۲ جمله).
- فقط به سوال فعلی مشاور پاسخ دهید.
- از اصطلاحات رایج استفاده کنید: رهن، ودیعه، متری، همکف، میلیون، میلیارد.
- هرگز slug انگلیسی مثل rent_rahn_ejare ننویسید.
- اگر chip پیشنهادی مناسب است می‌توانید همان label فارسی را بگویید.`;

function dealLabel(deal: string): string {
  return PROPERTY_DEAL_LABELS[deal] ?? deal;
}

function templateForField(ctx: UserSimContext): UserSimResult {
  const { persona, activeFieldKey, suggestedChips } = ctx;
  const hood = persona.district;
  const city = persona.city;

  if (ctx.isFirstTurn) {
    const kindFa =
      persona.propertyKind === 'shop'
        ? 'مغازه'
        : persona.propertyKind === 'office'
          ? 'دفتر'
          : persona.propertyKind === 'villa'
            ? 'ویلا'
            : persona.propertyKind === 'land'
              ? 'زمین'
              : 'آپارتمان';
    const dealFa = dealLabel(persona.dealType);
    let msg = `${kindFa} در ${hood} ${city} ${dealFa} می‌خوام`;
    if (persona.noise === 'preference') msg += '، پاساژ هم خوبه';
    if (persona.noise === 'typo') msg = msg.replace('می‌خوام', 'میخوام');
    return { message: msg, source: 'template' };
  }

  if (activeFieldKey === 'dealType') {
    const label = dealLabel(persona.dealType);
    const chip = suggestedChips.find((c) => c.label === label);
    return {
      message: label,
      chipFieldKey: 'dealType',
      chipValue: chip?.value ?? persona.dealType,
      source: 'chip',
    };
  }

  if (activeFieldKey === 'propertyKind') {
    return { message: persona.propertyKind === 'shop' ? 'مغازه' : 'آپارتمان', source: 'template' };
  }

  if (activeFieldKey === 'location') {
    const hoodChip = suggestedChips.find((c) => c.value.startsWith('__hood__:'));
    if (hoodChip) {
      return {
        message: hoodChip.label,
        chipFieldKey: 'location',
        chipValue: hoodChip.value,
        source: 'chip',
      };
    }
    return { message: `${hood}، ${city}`, source: 'template' };
  }

  if (activeFieldKey === 'budget') {
    const msg = `بودجه تا ${persona.budgetHint} میلیارد`;
    return { message: msg, chipFieldKey: 'budget', chipValue: msg, source: 'template' };
  }

  if (activeFieldKey === 'areaMin') {
    const msg =
      persona.noise === 'typo'
        ? `حدود ${persona.areaHint} متری`
        : `حدوداً ${persona.areaHint} متر`;
    return {
      message: msg,
      chipFieldKey: 'areaMin',
      chipValue: msg,
      source: 'template',
    };
  }

  if (activeFieldKey === 'deposit') {
    const msg = `ودیعه ${persona.depositHint} میلیون`;
    const chip = suggestedChips[0];
    return {
      message: chip?.label ? chip.value : msg,
      chipFieldKey: 'deposit',
      chipValue: chip?.value ?? msg,
      source: chip ? 'chip' : 'template',
    };
  }

  if (activeFieldKey === 'monthlyRent') {
    const msg = `اجاره ${persona.rentHint} میلیون`;
    const chip = suggestedChips[0];
    return {
      message: chip?.value ?? msg,
      chipFieldKey: 'monthlyRent',
      chipValue: chip?.value ?? msg,
      source: chip ? 'chip' : 'template',
    };
  }

  if (activeFieldKey === 'floorMin') {
    return { message: 'همکف', chipFieldKey: 'floorMin', chipValue: 'همکف', source: 'template' };
  }

  if (activeFieldKey === 'rooms') {
    return { message: 'دو خواب', source: 'template' };
  }

  if (activeFieldKey === 'nightlyRent') {
    return { message: 'اجاره شبانه ۵ میلیون', source: 'template' };
  }

  const chip = suggestedChips.find((c) => c.value !== 'preview' && c.value !== '__skip__');
  if (chip) {
    return {
      message: chip.label,
      chipFieldKey: activeFieldKey ?? undefined,
      chipValue: chip.value,
      source: 'chip',
    };
  }

  return { message: 'بله', source: 'template' };
}

async function llmUserMessage(ctx: UserSimContext): Promise<string | null> {
  const health = await checkQwenIntakeHealth();
  if (!health.ok) return null;

  const chipLines = ctx.suggestedChips
    .slice(0, 6)
    .map((c) => `- ${c.label}`)
    .join('\n');

  const userContent = [
    `شخصیت: ${ctx.persona.archetype} در ${ctx.persona.city} محله ${ctx.persona.district}`,
    `دسته هدف: ${ctx.persona.categorySlug} / ${ctx.persona.dealType}`,
    ctx.isFirstTurn
      ? 'اولین پیام خود را بنویسید.'
      : `سوال مشاور: ${ctx.lastAssistantMessage}`,
    ctx.activeFieldLabel ? `فیلد در حال پرسش: ${ctx.activeFieldLabel}` : '',
    chipLines ? `Chipهای پیشنهادی:\n${chipLines}` : '',
    'یک جمله فارسی بنویسید.',
  ]
    .filter(Boolean)
    .join('\n');

  const base = getNeedIntakeLlmBaseUrl();
  try {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3.5-2b',
        messages: [
          { role: 'system', content: USER_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        max_tokens: 120,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(Number(process.env.NEED_INTAKE_LLM_TIMEOUT_MS ?? 30_000)),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text || text.length < 2 || text.length > 400) return null;
    if (/rent_|shop-rent|apartment-rent/.test(text)) return null;
    return text.replace(/^["']|["']$/g, '');
  } catch {
    return null;
  }
}

function alignChipFromLlm(text: string, ctx: UserSimContext): UserSimResult {
  const field = ctx.activeFieldKey;
  if (!field) return { message: text, source: 'llm' };

  for (const chip of ctx.suggestedChips) {
    if (text.includes(chip.label) || chip.label.includes(text.slice(0, 8))) {
      const msg = field === 'dealType' ? chip.label : chip.value;
      return {
        message: msg,
        chipFieldKey: field,
        chipValue: chip.value,
        source: 'chip',
      };
    }
  }

  if (field === 'dealType') {
    const label = dealLabel(ctx.persona.dealType);
    if (text.includes('رهن') && text.includes('اجاره')) {
      return {
        message: label,
        chipFieldKey: 'dealType',
        chipValue: ctx.persona.dealType,
        source: 'llm',
      };
    }
  }

  return { message: text, source: 'llm' };
}

/** Generate next user message — LLM primary, template fallback. */
export async function simulateUserTurn(ctx: UserSimContext): Promise<UserSimResult> {
  if (process.env.V2_CONV_QA_TEMPLATE_ONLY === '1') {
    return templateForField(ctx);
  }

  const llm = await llmUserMessage(ctx);
  if (llm) {
    return alignChipFromLlm(llm, ctx);
  }

  return templateForField(ctx);
}

export function pickChipMessage(result: IntakeV2TurnResult, persona: ConversationPersona): UserSimResult | null {
  const preview = result.suggestedChips?.find((c) => c.value === 'preview');
  if (preview && result.readyToPreview) {
    return { message: preview.label, source: 'chip' };
  }
  return null;
}

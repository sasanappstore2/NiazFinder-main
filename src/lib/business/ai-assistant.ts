/**
 * AI Business Assistant — prompt system + contextual question generation.
 * Provider-agnostic: returns prompts and rule-based replies until LLM is wired.
 */

import type {
  AiAssistantConfig,
  AssistantChatRequest,
  AssistantChatResponse,
  Business,
  BusinessExtension,
  BusinessOffer,
  OfferCtaType,
} from '@/contracts/business-profile';

const CATEGORY_PROMPTS: Record<string, { system: string; questions: string[] }> = {
  restaurant: {
    system:
      'You are a friendly restaurant concierge. Help guests choose dishes, explain menu items, and guide them to reserve a table.',
    questions: [
      'چند نفر هستید؟',
      'غذای ایرانی یا بین‌المللی ترجیح می‌دهید؟',
      'آیا رژیم خاصی دارید (گیاهخواری، بدون گلوتن)؟',
    ],
  },
  doctor: {
    system:
      'You are a medical office assistant (not a doctor). Collect symptoms, suggest appropriate consultation offers, and help book appointments. Never diagnose.',
    questions: [
      'علائم اصلی شما چیست؟',
      'از چه مدت این مشکل را دارید؟',
      'آیا بیمه خاصی دارید؟',
    ],
  },
  salon: {
    system:
      'You are a beauty salon consultant. Understand style preferences and recommend suitable treatments.',
    questions: [
      'به دنبال چه نوع خدمتی هستید؟ (مو، ناخن، پوست)',
      'آیا نمونه کار خاصی مد نظر دارید؟',
      'برای چه تاریخی می‌خواهید وقت بگیرید؟',
    ],
  },
  mechanic: {
    system:
      'You are an auto repair shop assistant. Ask about vehicle and symptoms, estimate service type, recommend relevant repair offers.',
    questions: [
      'برند و مدل خودرو چیست؟',
      'مشکل اصلی چیست؟ (صدا، روغن، ترمز، …)',
      'آیا نیاز فوری دارید؟',
    ],
  },
  'real-estate': {
    system:
      'You are a real estate advisor. Understand budget, area, and property type; recommend listings or consultation.',
    questions: [
      'خرید یا اجاره؟',
      'محله یا متراژ مد نظر؟',
      'بودجه تقریبی چقدر است؟',
    ],
  },
  default: {
    system:
      'You are a helpful local business assistant for Needs Finder. Understand user needs, recommend relevant offers, and guide toward booking, quote, call, or chat.',
    questions: [
      'چه خدمتی نیاز دارید؟',
      'زمان مورد نظر شما چه زمانی است؟',
      'بودجه تقریبی دارید؟',
    ],
  },
};

function detectExtensionKey(extensions?: BusinessExtension): string {
  if (!extensions) return 'default';
  if (extensions.restaurant) return 'restaurant';
  if (extensions.doctor) return 'doctor';
  if (extensions.salon) return 'salon';
  if (extensions.mechanic) return 'mechanic';
  if (extensions.realEstate) return 'real-estate';
  return 'default';
}

function primaryCategorySlug(categories: string[]): string {
  return categories[0]?.toLowerCase() ?? 'default';
}

/** Build default AI config for a business from category + extensions. */
export function buildDefaultAiConfig(business: Pick<Business, 'name' | 'identity' | 'extensions'>): AiAssistantConfig {
  const key =
    detectExtensionKey(business.extensions) !== 'default'
      ? detectExtensionKey(business.extensions)
      : primaryCategorySlug(business.identity.category);

  const preset = CATEGORY_PROMPTS[key] ?? CATEGORY_PROMPTS.default;

  return {
    systemPrompt: `${preset.system}\n\nBusiness: ${business.name}. Location: ${business.identity.location.city}.`,
    dynamicQuestions: preset.questions,
    categoryHint: key,
  };
}

/** Merge stored config with defaults. */
export function resolveAiConfig(business: Business): AiAssistantConfig {
  const defaults = buildDefaultAiConfig(business);
  return {
    systemPrompt: business.aiAssistantConfig.systemPrompt || defaults.systemPrompt,
    dynamicQuestions:
      business.aiAssistantConfig.dynamicQuestions.length > 0
        ? business.aiAssistantConfig.dynamicQuestions
        : defaults.dynamicQuestions,
    categoryHint: business.aiAssistantConfig.categoryHint ?? defaults.categoryHint,
  };
}

function scoreOfferRelevance(offer: BusinessOffer, userText: string): number {
  const t = userText.toLowerCase();
  let score = 0;
  if (offer.title.toLowerCase().includes(t)) score += 3;
  if (offer.description.toLowerCase().includes(t)) score += 2;
  for (const f of offer.features) {
    if (t.includes(f.toLowerCase()) || f.toLowerCase().includes(t)) score += 1;
  }
  return score;
}

function pickCta(offers: BusinessOffer[]): OfferCtaType {
  const types = offers.map((o) => o.ctaType);
  if (types.includes('book')) return 'book';
  if (types.includes('quote')) return 'quote';
  if (types.includes('call')) return 'call';
  return 'chat';
}

/**
 * Rule-based assistant (swap body for OpenAI/Anthropic when API key is set).
 */
export function runBusinessAssistant(
  business: Business,
  req: AssistantChatRequest
): AssistantChatResponse {
  const config = resolveAiConfig(business);
  const lastUser = [...req.messages].reverse().find((m) => m.role === 'user')?.content ?? '';

  const ranked = [...business.offers]
    .map((o) => ({ o, score: scoreOfferRelevance(o, lastUser) }))
    .sort((a, b) => b.score - a.score);

  const top = ranked.filter((r) => r.score > 0).slice(0, 3).map((r) => r.o);
  const picks = top.length > 0 ? top : business.offers.slice(0, 2);

  let reply: string;
  if (!lastUser.trim()) {
    reply = `سلام! من دستیار ${business.name} هستم. چطور می‌توانم کمکتان کنم؟`;
  } else if (picks.length > 0) {
    const names = picks.map((p) => `«${p.title}»`).join('، ');
    const prices = picks
      .filter((p) => p.priceRange)
      .map((p) => `${p.title}: ${p.priceRange}`)
      .join(' | ');
    reply = `با توجه به نیاز شما، پیشنهاد می‌کنم: ${names}.${prices ? ` محدوده قیمت: ${prices}.` : ''} مایلید رزرو یا استعلام قیمت بگیرید؟`;
  } else {
    reply = `ممنون از پیام شما. تیم ${business.name} می‌تواند در «${business.identity.category[0] ?? 'خدمات'}» کمک کند. یکی از گزینه‌های تماس یا چت را انتخاب کنید.`;
  }

  const unanswered = config.dynamicQuestions.filter(
    (q) => !lastUser.includes(q.slice(0, 8))
  );

  return {
    reply,
    suggestedOffers: picks.map((p) => p.id),
    suggestedCta: pickCta(picks.length ? picks : business.offers),
    followUpQuestions: unanswered.slice(0, 2),
  };
}

/** Full system prompt for external LLM integration. */
export function buildLlmSystemPrompt(business: Business): string {
  const config = resolveAiConfig(business);
  const offersBlock = business.offers
    .map(
      (o) =>
        `- ${o.title}: ${o.description}${o.priceRange ? ` (${o.priceRange})` : ''} [cta:${o.ctaType}]`
    )
    .join('\n');

  return `${config.systemPrompt}

## Offers
${offersBlock || '(no offers listed)'}

## Rules
- Be concise, Persian (Farsi), professional.
- Recommend at most 2 offers per turn.
- Prefer conversion: book > quote > call > chat.
- Ask one clarifying question when intent is unclear.
`;
}

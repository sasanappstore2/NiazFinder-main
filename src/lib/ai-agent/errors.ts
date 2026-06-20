export class AiAgentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AiAgentError';
  }
}

export const AI_AGENT_CODES = {
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  AI_AGENT_DISABLED: 'AI_AGENT_DISABLED',
  NOT_PLATFORM_BOT: 'NOT_PLATFORM_BOT',
} as const;

export function paymentRequiredError() {
  return new AiAgentError('موجودی کیف پول کافی نیست', AI_AGENT_CODES.INSUFFICIENT_BALANCE, 402);
}

export const AI_AGENT_USER_MESSAGES = {
  "DISABLED": "دستیار هوش مصنوعی در حال حاضر غیرفعال است",
  "LLM_UNAVAILABLE": "سرویس هوش مصنوعی موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.",
  "NOT_FOUND": "گفتگو یافت نشد",
  "FORBIDDEN": "دسترسی به گفتگو مجاز نیست",
  "NOT_PLATFORM_BOT": "این چت مربوط به دستیار پلتفرم نیست",
  "SERVER_ERROR": "خطای سرور",
  "MOCK_WALLET": "موجودی کیف پول شما برای این پیام کافی نیست. لطفاً کیف پول را شارژ کنید.",
  "MOCK_GREETING": "سلام! من دستیار هوشمند نیازفایندر هستم. چطور می‌توانم در ثبت نیاز یا استفاده از سایت کمکتان کنم؟"
} as const;

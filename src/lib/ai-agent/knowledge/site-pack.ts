import { TOP_LEVEL_CATEGORIES, getDirectChildren } from '@/config/categories';
import {
  DEFAULT_VERTICAL_POLICY,
  ROOT_VERTICAL_POLICIES,
  resolveVerticalPolicy,
} from '@/intake/template/verticalPolicy';
import { agentMessageFeeToman } from '@/lib/ai-agent/env';

/** Compact Persian site knowledge injected into the agent system prompt. */
export function buildSiteKnowledgePack(): string {
  const fee = agentMessageFeeToman();
  const roots = TOP_LEVEL_CATEGORIES.map((c) => {
    const kids = getDirectChildren(c.slug)
      .slice(0, 6)
      .map((k) => k.title)
      .join('، ');
    return `- ${c.title} (${c.slug})${kids ? `: ${kids}` : ''}`;
  }).join('\n');

  const verticals = Object.entries(ROOT_VERTICAL_POLICIES)
    .slice(0, 8)
    .map(([key, p]) => {
      const req = p.requiredFields.join('، ') || '—';
      const opt = p.optionalFields.slice(0, 6).join('، ') || '—';
      return `- ${key}: الزامی=[${req}] اختیاری=[${opt}]`;
    })
    .join('\n');

  return `
دانش سایت نیازفایندر (خلاصه):
- مدل محصول: کاربر نیاز می‌نویسد (/post) → نیاز در بازار شهر (/n/{city}) دیده می‌شود → کسب‌وکارها پیشنهاد/چت می‌فرستند.
- کیف پول:
  • مشتری: هزینه هر پیام به «دستیار هوشمند» حدود ${fee.toLocaleString('fa-IR')} تومان از کیف پول مشتری کسر می‌شود.
  • کسب‌وکار: هزینه لید/VIP از کیف پول کسب‌وکار کسر می‌شود — نه از مشتری بابت پیام کسب‌وکار.
  • ثبت نیاز رایگان است؛ شارژ از داشبورد → کیف پول.
- مسیرهای مهم: /post ثبت نیاز | /n/{city} بازار نیاز | /s/{city} جستجو | داشبورد → کیف پول.
- دسته‌های اصلی:
${roots}
- فیلدهای رایج ثبت نیاز بر اساس vertical:
${verticals}
- قوانین: slug دسته/شهر را حدس نزن؛ از ابزارها بگیر. محله‌ها را لیست کامل ننویس؛ search_site_neighborhoods بزن.
- پاسخ تکراری نده؛ اگر کاربر دوباره پرسید، کوتاه‌تر و با عدد واقعی جواب بده.
`.trim();
}

export function explainNeedFieldsForVertical(verticalOrCategory: string): {
  vertical: string;
  requiredFields: string[];
  optionalFields: string[];
  publishHints: string[];
  deepLink: string;
} {
  const key = verticalOrCategory.trim().toLowerCase();
  let rootSlug: string | null = null;
  if (ROOT_VERTICAL_POLICIES[key]) rootSlug = key;
  else if (/estate|املاک|apartment|آپارتمان|اجاره|فروش/.test(key)) rootSlug = 'real-estate';
  else if (/vehicle|خودرو|ماشین|car/.test(key)) rootSlug = 'vehicles';
  else if (/electronic|موبایل|لپ/.test(key)) rootSlug = 'electronics';
  else if (/service|خدمت/.test(key)) rootSlug = 'services';
  else if (/job|شغل/.test(key)) rootSlug = 'jobs';

  const policy = rootSlug
    ? resolveVerticalPolicy({ rootSlug, category: key })
    : DEFAULT_VERTICAL_POLICY;

  return {
    vertical: policy.vertical,
    requiredFields: [...policy.requiredFields],
    optionalFields: [...policy.optionalFields],
    publishHints: [
      'دسته و شهر را مشخص کنید',
      'برای املاک: نوع معامله (خرید/اجاره) و محله مهم است',
      'بودجه و متراژ/اتاق در صورت وجود کیفیت matching را بالا می‌برد',
      'پس از تکمیل فرم در /post نیاز را منتشر کنید',
    ],
    deepLink: '/post',
  };
}

export function getSiteHelpFaq(topic?: string): {
  topic: string;
  answer: string;
  links: Array<{ label: string; href: string }>;
} {
  const fee = agentMessageFeeToman();
  const t = (topic ?? '').trim().toLowerCase();
  if (t.includes('wallet') || t.includes('کیف') || t.includes('شارژ') || t.includes('موجودی')) {
    return {
      topic: 'wallet',
      answer: `کیف پول برای پرداخت هزینه پیام به دستیار هوشمند (حدود ${fee.toLocaleString('fa-IR')} تومان برای هر پیام) و برای کسب‌وکارها هزینه لید است. ثبت نیاز رایگان است. شارژ از داشبورد → کیف پول. برای دیدن موجودی دقیق، وضعیت حساب را چک کنید.`,
      links: [{ label: 'داشبورد / کیف پول', href: '/dashboard' }],
    };
  }
  if (t.includes('post') || t.includes('ثبت') || t.includes('نیاز')) {
    return {
      topic: 'post',
      answer:
        'برای ثبت نیاز به /post بروید، متن نیاز را بنویسید، دسته و شهر و فیلدهای لازم را کامل کنید، سپس منتشر کنید. کسب‌وکارهای مرتبط می‌توانند پیشنهاد بدهند.',
      links: [
        { label: 'ثبت نیاز', href: '/post' },
        { label: 'بازار نیاز تهران', href: '/n/tehran' },
      ],
    };
  }
  return {
    topic: 'general',
    answer:
      'نیازفایندر یک بازار معکوس است: شما نیازتان را ثبت می‌کنید و کسب‌وکارها به شما پیشنهاد می‌دهند. می‌توانم در دسته‌بندی، ثبت نیاز، جستجوی نیازها و وضعیت حساب کمکتان کنم.',
    links: [
      { label: 'ثبت نیاز', href: '/post' },
      { label: 'خانه', href: '/' },
    ],
  };
}

export function formatTomanFa(amount: number): string {
  return `${amount.toLocaleString('fa-IR')} تومان`;
}

/** Short factual wallet reply from check_user_account_status. */
export function buildWalletStatusReply(status: {
  wallet?: {
    balance?: number;
    frozen?: number;
    available?: number;
    agentMessageFee?: number;
  };
}): string {
  const w = status.wallet ?? {};
  const available = Number(w.available ?? w.balance ?? 0);
  const frozen = Number(w.frozen ?? 0);
  const fee = Number(w.agentMessageFee ?? agentMessageFeeToman());
  const lines = [`موجودی قابل استفاده شما ${formatTomanFa(available)} است.`];
  if (frozen > 0) {
    lines.push(`مبلغ مسدود (فریز): ${formatTomanFa(frozen)}.`);
  }
  lines.push(
    `هزینه هر پیام به دستیار هوشمند حدود ${formatTomanFa(fee)} است.`,
    'ثبت نیاز رایگان است. برای شارژ به صفحه داشبورد → کیف پول در نیازفایندر بروید.',
  );
  return lines.join(' ');
}

export function buildCategoryLookupReply(
  query: string,
  hits: Array<{ name?: string; slug?: string; path?: string }>,
): string {
  if (!hits.length) {
    return `برای «${query}» دسته‌ای پیدا نکردم. می‌توانید در /post متن نیازتان را بنویسید تا دسته پیشنهاد شود، یا با کلمهٔ دیگری جستجو کنید.`;
  }
  const top = hits.slice(0, 5).map((h) => {
    const label = h.path || h.name || h.slug || '—';
    return h.slug ? `«${label}» (${h.slug})` : `«${label}»`;
  });
  return `برای «${query}» این دسته‌ها مرتبط‌اند: ${top.join('، ')}. برای ثبت نیاز به /post بروید و همین دسته را انتخاب کنید.`;
}

export function buildPostGuideReply(): string {
  return 'برای ثبت نیاز به صفحه /post بروید، متن نیاز را بنویسید، دسته و شهر را انتخاب کنید، فیلدهای لازم (مثل بودجه یا محله) را کامل کنید و منتشر کنید. بعد از انتشار، کسب‌وکارهای مرتبط می‌توانند پیشنهاد بدهند.';
}

export function buildGeoLookupReply(
  query: string,
  kind: 'city' | 'neighborhood' | 'nationwide_neighborhood',
  hits: Array<{ name?: string; slug?: string; cityName?: string }>,
  meta?: { cityCount?: number; cities?: string[] },
): string {
  if (kind === 'nationwide_neighborhood') {
    const cityCount = meta?.cityCount ?? new Set(hits.map((h) => h.cityName).filter(Boolean)).size;
    const cities =
      meta?.cities?.length
        ? meta.cities
        : [...new Set(hits.map((h) => h.cityName).filter(Boolean) as string[])];
    if (!cityCount) {
      return `محله‌ای با نام «${query}» در کاتالوگ شهرهای ایران پیدا نکردم. نام را دقیق‌تر بگویید (مثلاً فقط «فردوسی»).`;
    }
    const sample = cities.slice(0, 12).join('، ');
    const more = cityCount > 12 ? ` و ${cityCount - 12} شهر دیگر` : '';
    return `محله «${query}» در ${cityCount.toLocaleString('fa-IR')} شهر در کاتالوگ نیازفایندر ثبت شده است؛ از جمله: ${sample}${more}. برای ثبت نیاز، شهر را در /post انتخاب کنید و بعد محله را بزنید.`;
  }

  if (!hits.length) {
    return kind === 'city'
      ? `شهری با عبارت «${query}» پیدا نکردم. نام شهر را دقیق‌تر بنویسید یا در /post از انتخابگر شهر استفاده کنید.`
      : `محله‌ای با عبارت «${query}» پیدا نکردم. نام محله و شهر را دقیق‌تر بگویید.`;
  }
  const top = hits.slice(0, 5).map((h) => {
    const label = h.name || h.slug || '—';
    return h.cityName ? `«${label}» (${h.cityName})` : h.slug ? `«${label}» (${h.slug})` : `«${label}»`;
  });
  return kind === 'city'
    ? `برای «${query}» این شهرها پیدا شد: ${top.join('، ')}. در ثبت نیاز (/post) همین شهر را انتخاب کنید.`
    : `برای «${query}» این محله‌ها مرتبط‌اند: ${top.join('، ')}. در /post محله را انتخاب کنید؛ لیست کامل را اینجا نمی‌نویسم.`;
}

/** Extract a clean place name from geo questions (never pass the whole sentence to search). */
export function extractGeoPlaceQuery(text: string): {
  kind: 'city' | 'neighborhood' | 'nationwide_neighborhood';
  query: string;
  cityHint?: string;
} | null {
  const t = text.trim().replace(/\s+/g, ' ');
  if (!t) return null;

  const nationwide =
    t.match(/محله\s+([^\s؟?،,]+).*(?:چند\s*شهر|کدام\s*شهر|چه\s*شهر|داریم)/i) ||
    t.match(/(?:چند\s*شهر|کدام\s*شهر|چه\s*شهر|در\s*چند\s*شهر).*محله\s+([^\s؟?،,]+)/i);
  if (nationwide) {
    const query = (nationwide[1] || nationwide[2] || '').trim();
    if (query) return { kind: 'nationwide_neighborhood', query };
  }

  const neighCity = t.match(
    /^محله\s+([^\s؟?،,]+)(?:\s+(تهران|شیراز|اصفهان|مشهد|کرج|اهواز|تبریز|قم|رشت))?[\s!.؟?]*$/i,
  );
  if (neighCity) {
    return {
      kind: 'neighborhood',
      query: neighCity[1]!.trim(),
      cityHint: neighCity[2]?.trim(),
    };
  }

  const cityOnly = t.match(
    /^(?:جستجوی\s*شهر\s+)?شهر\s+([^\s؟?،,]+)(?:\s+رو)?(?:\s+پیدا\s*کن)?[\s!.؟?]*$/i,
  );
  if (cityOnly) {
    return { kind: 'city', query: cityOnly[1]!.trim() };
  }

  const searchCity = t.match(/^جستجوی\s*شهر\s+(.+?)[\s!.؟?]*$/i);
  if (searchCity) {
    return { kind: 'city', query: searchCity[1]!.trim() };
  }

  return null;
}

/** Extract city + optional category hints for marketplace deep-links. */
export function extractMarketplaceLinkRequest(text: string): {
  cityQuery: string | null;
  categoryQuery: string | null;
} {
  const t = text.trim().replace(/\u200c/g, '').replace(/\s+/g, ' ');
  const cityMatch =
    t.match(/شهر\s+([^\s؟?،,]+)/i) ||
    t.match(/در\s+([^\s؟?،,]+)\s*(?:برای|نیاز|بازار)/i);
  const cityQuery = cityMatch?.[1]?.trim() || null;

  let categoryQuery: string | null = null;
  if (/خودرویی|خودرو|ماشین|اتومبیل|وسایل\s*نقلیه/i.test(t)) categoryQuery = 'خودرو';
  else if (/املاک|آپارتمان|ملک|اجاره|رهن/i.test(t)) categoryQuery = 'املاک';
  else if (/موبایل|تبلت/i.test(t)) categoryQuery = 'موبایل';
  else if (/لپ\s*تاپ|کامپیوتر/i.test(t)) categoryQuery = 'لپ تاپ';
  else if (/استخدام|شغل|کاریابی/i.test(t)) categoryQuery = 'استخدام';
  else if (/موتورسیکلت|موتور/i.test(t)) categoryQuery = 'موتورسیکلت';
  else if (/خدمات/i.test(t)) categoryQuery = 'خدمات';

  return { cityQuery, categoryQuery };
}

export function buildMarketplaceLinkReply(input: {
  cityName?: string | null;
  citySlug?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  cityMissing?: boolean;
}): string {
  if (input.cityMissing || !input.citySlug) {
    return 'برای ساخت لینک بازار نیاز، نام شهر را دقیق بگویید (مثلاً تهران یا آشتیان). قالب لینک: /n/{city} یا /n/{city}/{category}.';
  }
  const cityLabel = input.cityName || input.citySlug;
  if (input.categorySlug) {
    const href = `/n/${input.citySlug}/${input.categorySlug}`;
    const catLabel = input.categoryName || input.categorySlug;
    return `لینک نیازهای «${catLabel}» در ${cityLabel}: ${href} — بازار کلی شهر هم اینجاست: /n/${input.citySlug}`;
  }
  return `لینک بازار نیاز ${cityLabel}: /n/${input.citySlug}`;
}

export function buildNeedSearchReply(
  query: string,
  hits: Array<{ title?: string; city?: string; category?: string; categoryName?: string }>,
): string {
  if (!hits.length) {
    return `نیاز بازی با عبارت «${query}» پیدا نکردم. می‌توانید خودتان در /post نیاز مشابه ثبت کنید یا در /n/{city} بازار شهر را ببینید.`;
  }
  const top = hits.slice(0, 5).map((h) => {
    const bits = [h.title, h.city, h.categoryName ?? h.category].filter(Boolean);
    return `«${bits.join(' — ') || 'نیاز'}»`;
  });
  return `چند نیاز مرتبط با «${query}»: ${top.join('؛ ')}. برای دیدن بیشتر به بازار شهر (/n/{city}) بروید یا نیاز خودتان را در /post ثبت کنید.`;
}

export function buildBusinessSearchReply(
  query: string,
  hits: Array<{ name?: string; city?: string; href?: string; slug?: string; verified?: boolean }>,
): string {
  if (!hits.length) {
    return `کسب‌وکار عمومی فعالی با عبارت «${query}» پیدا نکردم. می‌توانید در /b/{city} بازار کسب‌وکارها را ببینید.`;
  }
  const top = hits.slice(0, 5).map((h) => {
    const href = h.href || (h.slug ? `/b/${h.slug}` : null);
    const label = [h.name, h.city, h.verified ? 'تأییدشده' : null].filter(Boolean).join(' — ');
    return href ? `«${label}» (${href})` : `«${label}»`;
  });
  return `چند کسب‌وکار مرتبط با «${query}»: ${top.join('؛ ')}. برای جزئیات بیشتر روی لینک پروفایل بزنید.`;
}

export function buildSiteKnowledgeReply(
  query: string,
  chunks: Array<{ title?: string; content?: string; route?: string | null }>,
): string {
  if (!chunks.length) {
    return `راهنمای مشخصی برای «${query}» در دانش سایت پیدا نکردم. می‌توانید از /help یا /post شروع کنید.`;
  }
  const top = chunks[0]!;
  const route = top.route ? ` مسیر مرتبط: ${top.route}.` : '';
  const body = (top.content || '').replace(/\s+/g, ' ').trim().slice(0, 280);
  return `${top.title ? `${top.title}: ` : ''}${body}${route}`;
}

export function buildGreetingReply(text: string): string {
  if (/ممنون|مرسی|تشکر/.test(text)) {
    return 'خواهش می‌کنم. اگر سوال دیگری درباره ثبت نیاز، دسته‌ها یا کیف پول دارید بپرسید.';
  }
  if (/خوبی|خوبید|چطوری|چطورید/.test(text)) {
    return 'سلام، ممنون خوبم. من دستیار نیازفایندر هستم؛ بگویید در ثبت نیاز، دسته‌ها یا کیف پول چه کمکی بکنم.';
  }
  return 'سلام! من دستیار نیازفایندر هستم. می‌توانم در ثبت نیاز، دسته‌بندی‌ها، شهرها و کیف پول کمکتان کنم.';
}

export function buildIdentityReply(): string {
  return 'من دستیار رسمی نیازفایندر هستم. می‌توانم در ثبت نیاز (/post)، پیدا کردن دسته و شهر، توضیح کیف پول و جستجوی نیازها کمکتان کنم. بگویید از کجا شروع کنیم.';
}

/** Short product FAQ answers for common non-tool questions. */
export function buildProductFaqReply(text: string): string | null {
  const t = text.trim();
  if (/لید\s*یعنی|لید\s*چیست|لید\s*چی|لید\s*می‌خر|خرید\s*لید|کسب.?وکار\s*چطور\s*لید/i.test(t)) {
    return 'لید یعنی فرصت ارتباط با مشتری برای کسب‌وکار. کسب‌وکار از کیف پول خودش هزینه لید را می‌پردازد (نه مشتری). مشتری فقط نیاز را در /post ثبت می‌کند.';
  }
  if (/چت.*(کسب.?وکار|فروشنده)|با\s*کسب.?وکار\s*چت/i.test(t)) {
    return 'بعد از ثبت نیاز، کسب‌وکارهای مرتبط می‌توانند پیشنهاد بدهند یا چت را شروع کنند. گفتگو در بخش چت/داشبورد شما دیده می‌شود.';
  }
  if (/بازار\s*نیاز|لینک\s*ثبت|صفحه\s*\/post|\/post/i.test(t) && /کجا|لینک|چیه|چیکار/.test(t)) {
    if (/\/post|ثبت\s*نیاز|لینک\s*ثبت|صفحه/.test(t)) {
      return 'لینک ثبت نیاز: /post — متن نیاز را بنویسید، دسته و شهر را انتخاب کنید و منتشر کنید.';
    }
    if (/بازار/.test(t)) {
      return 'بازار نیاز هر شهر در مسیر /n/{city} است؛ مثلاً تهران: /n/tehran.';
    }
  }
  if (/ثبت\s*نیاز\s*رایگان|آیا\s*ثبت\s*نیاز\s*رایگان/i.test(t)) {
    return 'بله، ثبت نیاز رایگان است. هزینه پیام به دستیار هوشمند از کیف پول مشتری کسر می‌شود؛ هزینه لید را کسب‌وکار می‌پردازد.';
  }
  if (/هزینه\s*پیام|پیام\s*دستیار|برای\s*چت\s*با\s*دستیار/i.test(t)) {
    const fee = agentMessageFeeToman();
    return `هزینه هر پیام به دستیار هوشمند حدود ${formatTomanFa(fee)} است و از کیف پول شما کسر می‌شود. ثبت نیاز رایگان است.`;
  }
  if (/نقش\s*من|تفاوت\s*مشتری|مشتری\s*و\s*کسب/i.test(t)) {
    return 'مشتری نیاز ثبت می‌کند و پیشنهاد می‌گیرد؛ کسب‌وکار نیازها را می‌بیند و برای لید/پیشنهاد از کیف پول خودش هزینه می‌پردازد.';
  }
  if (/پیشنهاد\s*بگیرم|بعد\s*از\s*ثبت\s*نیاز/i.test(t)) {
    return 'بعد از انتشار نیاز در /post، نیاز در بازار شهر دیده می‌شود و کسب‌وکارهای مرتبط می‌توانند پیشنهاد یا چت بفرستند.';
  }
  if (/تازه‌?وارد|از\s*کجا\s*شروع|راهنمای\s*کوتاه/i.test(t)) {
    return 'از /post شروع کنید: نیازتان را بنویسید، دسته و شهر را بزنید و منتشر کنید. بعد بازار شهر (/n/{city}) و کیف پول در داشبورد را ببینید.';
  }
  if (/پشتیبانی|ساعت\s*کاری|اپلیکیشن\s*موبایل/i.test(t)) {
    if (/اپلیکیشن|موبایل/.test(t)) {
      return 'در حال حاضر وب‌سایت نیازفایندر در دسترس است؛ از مرورگر موبایل هم می‌توانید ثبت نیاز و چت را انجام دهید.';
    }
    return 'برای راهنمایی محصول همین دستیار در چت کمک می‌کند. سوال مشخص‌تان را بپرسید تا مسیر دقیق را بگویم.';
  }
  if (/نقشه|پین\s*روی\s*نقشه/i.test(t)) {
    return 'در ثبت نیاز می‌توانید موقعیت را روی نقشه مشخص کنید تا matching دقیق‌تر شود. اگر اجباری نبود، بدون پین هم می‌توانید منتشر کنید.';
  }
  if (/بودجه|رهن\s*و\s*اجاره|ویرایش\s*کنم|چند\s*نیاز/i.test(t)) {
    if (/ویرایش/.test(t)) {
      return 'نیازهای خود را از داشبورد/لیست نیازهایتان باز کنید و ویرایش کنید. اگر گزینه را ندیدید، نیاز را پیدا کرده و جزئیات را به‌روز کنید.';
    }
    if (/چند\s*نیاز/.test(t)) {
      return 'بله، می‌توانید چند نیاز همزمان داشته باشید؛ هر نیاز جداگانه در بازار شهر مربوطه دیده می‌شود.';
    }
    if (/رهن|اجاره/.test(t)) {
      return 'برای رهن و اجاره در صفحه /post نوع معامله، محله، متراژ و بودجه (رهن/اجاره) را بنویسید تا پیشنهادها دقیق‌تر شوند.';
    }
    return 'بودجه را در صفحه /post به‌صورت عددی وارد کنید؛ برای املاک رهن و اجاره را جداگانه مشخص کنید.';
  }
  return null;
}

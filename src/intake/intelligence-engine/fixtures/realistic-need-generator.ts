import { extractJsonFromChatContent, localChatCompletions } from '@/lib/need-intake/local-chat-client';
import type { CategoryTestProfile } from '@/intake/intelligence-engine/fixtures/category-test-matrix';

export interface GeneratedNeedCase {
  profile: CategoryTestProfile;
  text: string;
  source: 'gemma' | 'template';
}

const TEMPLATE_BY_VERTICAL: Record<string, (p: CategoryTestProfile) => string> = {
  'real-estate': (p) => {
    const city = p.locationHints?.[0] ?? '\u062A\u0647\u0631\u0627\u0646';
    if (p.categorySlug.includes('rent')) {
      return `\u0645\u06CC\u062E\u0648\u0627\u0645 \u062A\u0627 \u067E\u0648\u0646\u0635\u062F \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0631\u0647\u0646 \u0648 \u062F\u0648 \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0627\u062C\u0627\u0631\u0647 \u062F\u0631 ${city} \u0628\u0631\u0627\u06CC ${p.titleFa}`;
    }
    if (p.categorySlug.includes('sale')) {
      return `\u0641\u0631\u0648\u0634 ${p.titleFa} \u062F\u0631 ${city} \u062A\u0627 \u067E\u0646\u062C \u0645\u06CC\u0644\u06CC\u0627\u0631\u062F \u062A\u0648\u0645\u0627\u0646`;
    }
    return `\u0627\u0633\u062A\u0627\u062C\u0627\u0631 ${p.titleFa} \u062F\u0631 ${city}`;
  },
  vehicles: (p) => {
    const city = p.locationHints?.[0] ?? '\u062A\u0647\u0631\u0627\u0646';
    return `\u0645\u06CC\u062E\u0648\u0627\u0647 \u062E\u0648\u062F\u0631\u0648 \u062F\u0631 ${city} \u0628\u0631\u0627\u06CC ${p.titleFa} \u062A\u0627 \u062D\u062F\u0648\u062F 800 \u0645\u06CC\u0644\u06CC\u0648\u0646 \u062A\u0648\u0645\u0627\u0646`;
  },
  electronics: (p) => {
    const city = p.locationHints?.[0] ?? '\u062A\u0647\u0631\u0627\u0646';
    return `\u062E\u0631\u06CC\u062F ${p.titleFa} \u062F\u0631 ${city} \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u062A\u0645\u06CC\u0632`;
  },
  'home-appliances': (p) => {
    const city = p.locationHints?.[0] ?? '\u062A\u0647\u0631\u0627\u0646';
    return `\u0641\u0631\u0648\u0634 ${p.titleFa} \u062F\u0631 ${city} \u062F\u0631 \u062D\u062F\u0648\u062F \u0639\u0627\u0644\u06CC`;
  },
  services: (p) => {
    const city = p.locationHints?.[0] ?? '\u062A\u0647\u0631\u0627\u0646';
    return `\u0646\u06CC\u0627\u0632 \u0628\u0647 ${p.titleFa} \u062F\u0631 ${city} \u0647\u0645\u06CC\u0646 \u0647\u0641\u062A\u0647`;
  },
  jobs: (p) => {
    const city = p.locationHints?.[0] ?? '\u062A\u0647\u0631\u0627\u0646';
    return `\u062C\u0630\u0628 ${p.titleFa} \u062F\u0631 ${city} \u0628\u0627 \u062D\u0642\u0648\u0642 \u0648 \u0645\u0632\u0627\u06CC\u0627 \u062A\u0645\u0627\u0645`;
  },
  'personal-items': (p) => {
    const city = p.locationHints?.[0] ?? '\u062A\u0647\u0631\u0627\u0646';
    return `\u0641\u0631\u0648\u0634 ${p.titleFa} \u062F\u0631 ${city} \u0627\u0635\u0644 \u0648 \u062A\u0645\u06CC\u0632`;
  },
  entertainment: (p) => {
    const city = p.locationHints?.[0] ?? '\u062A\u0647\u0631\u0627\u0646';
    return `\u0622\u06AF\u0647\u06CC ${p.titleFa} \u062F\u0631 ${city} \u0645\u06CC\u062E\u0648\u0627\u0645`;
  },
};

export function templateFallback(profile: CategoryTestProfile): string {
  const fn = TEMPLATE_BY_VERTICAL[profile.vertical];
  if (fn) return fn(profile);
  const city = profile.locationHints?.[0] ?? '\u062A\u0647\u0631\u0627\u0646';
  return `\u0622\u06AF\u0647\u06CC ${profile.titleFa} \u062F\u0631 ${city} \u0645\u06CC\u062E\u0648\u0627\u0645`;
}

export async function generateRealisticNeed(
  profile: CategoryTestProfile
): Promise<GeneratedNeedCase> {
  const chat = await localChatCompletions(
    [
      {
        role: 'system',
        content:
          'Write ONE realistic colloquial Persian need post for Iranian marketplace. JSON only.',
      },
      {
        role: 'user',
        content: `Category: ${profile.categorySlug} (${profile.titleFa})
Vertical: ${profile.vertical}
Scenario: ${profile.generationHint}
Cities to mention: ${(profile.locationHints ?? []).join(', ')}
Rules: 1-3 sentences, natural Persian, include price/area/details when relevant.
Stay strictly in this category ? avoid unrelated verticals (e.g. no apartment hunt when selling a phone).
Return JSON: {"text":"..."}`,
      },
    ],
    { maxTokens: 280, temperature: 0.9, maxRetries: 0 }
  );

  if (chat) {
    const json = extractJsonFromChatContent(chat.content) as { text?: string } | null;
    const text = json?.text?.trim();
    if (text && text.length >= 12) {
      return { profile, text, source: 'gemma' };
    }
  }

  return { profile, text: templateFallback(profile), source: 'template' };
}

export async function generateNeedBatch(
  profiles: CategoryTestProfile[]
): Promise<GeneratedNeedCase[]> {
  const out: GeneratedNeedCase[] = [];
  for (let i = 0; i < profiles.length; i++) {
    process.stdout.write(`\r  gemma generate ${i + 1}/${profiles.length}...`);
    out.push(await generateRealisticNeed(profiles[i]!));
  }
  console.log('');
  return out;
}

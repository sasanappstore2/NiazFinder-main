import type { CategoryTestProfile } from '@/intake/intelligence-engine/fixtures/category-test-matrix';
import { buildTestProfiles } from '@/intake/intelligence-engine/fixtures/category-test-matrix';
import {
  generateRealisticNeed,
  templateFallback,
  type GeneratedNeedCase,
} from '@/intake/intelligence-engine/fixtures/realistic-need-generator';
import { localChatCompletions } from '@/lib/need-intake/local-chat-client';
import { extractJsonFromChatContent } from '@/lib/need-intake/local-chat-client';

export const HUMAN_TONES = [
  { id: 'casual', labelFa: '\u0639\u0627\u0645\u06CC\u0627\u0646\u0647', hint: 'colloquial, friendly, like Divar chat' },
  { id: 'urgent', labelFa: '\u0641\u0648\u0631\u06CC', hint: 'urgent, needs ASAP, stressed tone' },
  { id: 'formal', labelFa: '\u0631\u0633\u0645\u06CC', hint: 'formal polite Persian' },
  { id: 'brief', labelFa: '\u0645\u062E\u062A\u0635\u0631', hint: 'very short 1 sentence telegraphic' },
  { id: 'detailed', labelFa: '\u062C\u0632\u0626\u06CC\u0627\u062A\u06CC', hint: 'detailed with specs, numbers, conditions' },
  { id: 'bargain', labelFa: '\u0686\u0627\u0646\u0647', hint: 'price-sensitive, negotiable, budget focused' },
  { id: 'emotional', labelFa: '\u0639\u0627\u0637\u0641\u06CC', hint: 'personal story, emotional need' },
  { id: 'professional', labelFa: '\u062D\u0631\u0641\u0647\u200C\u0627\u06CC', hint: 'business/professional wording' },
  { id: 'regional', labelFa: '\u0645\u062D\u0644\u06CC', hint: 'regional/colloquial markers ok' },
  { id: 'mixed', labelFa: '\u062A\u0631\u06A9\u06CC\u0628\u06CC', hint: 'mix formal + casual like real users' },
] as const;

export type HumanToneId = (typeof HUMAN_TONES)[number]['id'];

export interface HumanNeedCase extends GeneratedNeedCase {
  tone: HumanToneId;
  batchIndex: number;
  caseIndex: number;
}

function toneForIndex(globalIndex: number): HumanToneId {
  return HUMAN_TONES[globalIndex % HUMAN_TONES.length]!.id;
}

export function pickProfilesForBatch(
  batchIndex: number,
  batchSize: number,
  prioritySlugs: string[] = []
): CategoryTestProfile[] {
  const round = batchIndex + 1;
  const base = buildTestProfiles(batchSize * 2, round);
  const out: CategoryTestProfile[] = [];
  const used = new Set<string>();

  for (const slug of prioritySlugs) {
    if (out.length >= batchSize) break;
    const hit = base.find((p) => p.categorySlug === slug);
    if (hit && !used.has(slug)) {
      used.add(slug);
      out.push({ ...hit, id: `prio-${slug}-b${batchIndex}` });
    }
  }

  for (const p of base) {
    if (out.length >= batchSize) break;
    if (used.has(p.categorySlug)) continue;
    used.add(p.categorySlug);
    out.push({ ...p, id: `${p.id}-b${batchIndex}` });
  }

  return out.slice(0, batchSize);
}

async function generateWithTone(
  profile: CategoryTestProfile,
  tone: HumanToneId,
  globalIndex: number
): Promise<GeneratedNeedCase> {
  const toneMeta = HUMAN_TONES.find((t) => t.id === tone)!;
  const chat = await localChatCompletions(
    [
      {
        role: 'system',
        content:
          'Write ONE realistic Persian marketplace need post. JSON only. Sound like a real human, not AI.',
      },
      {
        role: 'user',
        content: `Category: ${profile.categorySlug} (${profile.titleFa})
Vertical: ${profile.vertical}
Tone: ${toneMeta.hint}
Scenario: ${profile.generationHint}
Cities: ${(profile.locationHints ?? []).join(', ')}
Variation seed: ${globalIndex}
Rules: 1-3 sentences, natural Persian, include price/area/details when relevant for category.
Stay strictly in this category.
Return JSON: {"text":"..."}`,
      },
    ],
    { maxTokens: 320, temperature: 0.85 + (globalIndex % 5) * 0.03, maxRetries: 0 }
  );

  if (chat) {
    const json = extractJsonFromChatContent(chat.content) as { text?: string } | null;
    const text = json?.text?.trim();
    if (text && text.length >= 12) {
      return { profile, text, source: 'gemma' };
    }
  }

  const fallback = templateFallback(profile);
  return { profile, text: `[${toneMeta.labelFa}] ${fallback}`, source: 'template' };
}

export async function composeHumanNeedBatch(
  batchIndex: number,
  batchSize: number,
  globalStartIndex: number,
  prioritySlugs: string[] = [],
  useLlm: boolean
): Promise<HumanNeedCase[]> {
  const profiles = pickProfilesForBatch(batchIndex, batchSize, prioritySlugs);
  const out: HumanNeedCase[] = [];

  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i]!;
    const globalIndex = globalStartIndex + i;
    const tone = toneForIndex(globalIndex);
    process.stdout.write(`\r  compose ${i + 1}/${profiles.length} (${profile.categorySlug}, ${tone})...`);

    const generated = useLlm
      ? await generateWithTone(profile, tone, globalIndex)
      : { profile, text: templateFallback(profile), source: 'template' as const };

    out.push({
      ...generated,
      tone,
      batchIndex,
      caseIndex: i,
    });
  }

  console.log('');
  return out;
}

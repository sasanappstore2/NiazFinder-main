import type { FieldOption, NeedDraft } from '@/contracts/need-intake';
import type { IntakeV2TurnResult } from '@/lib/intake-v2/orchestrate-turn';
import type { ConversationPersona } from '@/lib/intake-v2/sim/persona-matrix';
import { validateNeedDraftForPublish } from '@/intake/validation/publishValidator';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { isGenericListingTitle } from '@/lib/need-intake/vertical-title';
import {
  depositPresetChips,
  areaPresetChips,
  monthlyRentPresetChips,
} from '@/lib/intake-v2/v2-chip-presets';
import { PROPERTY_DEAL_LABELS } from '@/config/need-schemas/labels';
import { extractLocationFragment } from '@/lib/need-intake/location-fragment';

function compactLocationText(text: string): string {
  return text
    .replace(/\u200c/g, '')
    .replace(/[،,]/g, ' ')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

function locationContainsFragment(loc: string, fragment: string): boolean {
  const l = compactLocationText(loc);
  const f = compactLocationText(fragment);
  if (!l || !f) return false;
  return l.includes(f) || f.includes(l);
}
import {
  checkQwenIntakeHealth,
  getNeedIntakeLlmBaseUrl,
} from '@/lib/need-intake/qwen-intake-client';

export type AuditSeverity = 'error' | 'warn' | 'info';

export interface AuditFinding {
  ruleId: string;
  severity: AuditSeverity;
  message: string;
  turn?: number;
  detail?: string;
}

export interface TurnAuditContext {
  turn: number;
  persona: ConversationPersona;
  userMessage: string;
  result: IntakeV2TurnResult;
  priorActiveFieldKey: string | null;
  priorConfirmedCount: number;
  repeatFieldCounts: Map<string, number>;
}

const RAW_CHIP_PATTERN = /rent_rahn_|rent_monthly|shop-rent|apartment-rent/;

function chipsMatchField(fieldKey: string | null, chips: FieldOption[] | undefined): boolean {
  if (!fieldKey || !chips?.length) return true;
  if (fieldKey === 'deposit') {
    const labels = new Set(depositPresetChips().map((c) => c.label));
    return chips.some((c) => labels.has(c.label) || /ودیعه|رهن|M/.test(c.label));
  }
  if (fieldKey === 'areaMin') {
    const labels = new Set(areaPresetChips().map((c) => c.label));
    return chips.some((c) => labels.has(c.label) || /متر|m/.test(c.label));
  }
  if (fieldKey === 'monthlyRent') {
    const labels = new Set(monthlyRentPresetChips().map((c) => c.label));
    return chips.some((c) => labels.has(c.label) || /اجاره|M/.test(c.label));
  }
  if (fieldKey === 'dealType') {
    return chips.some((c) => Object.values(PROPERTY_DEAL_LABELS).includes(c.label));
  }
  return true;
}

function categoryMatchesPersona(persona: ConversationPersona, slug: string): boolean {
  if (slug === persona.categorySlug) return true;
  const expected = persona.categorySlug;
  const kind = persona.propertyKind;
  if (expected.includes('shop') && slug.includes('shop')) return true;
  if (expected.includes('office') && slug.includes('office')) return true;
  if (expected.includes('apartment') && /apartment|residential|suite/.test(slug)) return true;
  if (expected.includes('villa') && slug.includes('villa')) return true;
  if (expected.includes('land') && slug.includes('land')) return true;
  if (expected.includes('industrial') && slug.includes('industrial')) return true;
  if (kind === 'shop' && slug.includes('shop')) return true;
  return false;
}

export function auditTurn(ctx: TurnAuditContext): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const { result, persona, userMessage, turn } = ctx;
  const draft = result.needDraft;

  if (!chipsMatchField(result.activeFieldKey ?? null, result.suggestedChips)) {
    findings.push({
      ruleId: 'chip_question_mismatch',
      severity: 'error',
      message: `Chips do not match activeFieldKey=${result.activeFieldKey}`,
      turn,
      detail: result.suggestedChips?.map((c) => c.label).join(','),
    });
  }

  if (result.readyToPreview && (result.missingFields?.length ?? 0) > 0) {
    findings.push({
      ruleId: 'premature_preview',
      severity: 'error',
      message: 'readyToPreview with missing fields',
      turn,
    });
  }

  const publish = validateNeedDraftForPublish(draft);
  if (result.readyToPreview && !publish.success) {
    findings.push({
      ruleId: 'publish_gate_drift',
      severity: 'error',
      message: publish.errors.map((e) => e.message).join(' · '),
      turn,
    });
  }

  const deal = String(draft.answers.dealType ?? '');
  if (
    deal === 'rent_rahn_ejare' &&
    result.assistantMessage.includes('اجاره ماهانه') &&
    result.confirmedDelta?.includes('dealType')
  ) {
    findings.push({
      ruleId: 'deal_ack_wrong',
      severity: 'error',
      message: 'Ack says monthly rent for rahn_ejare',
      turn,
    });
  }

  if (
    draft.parsedIntent.categorySlug &&
    !categoryMatchesPersona(persona, draft.parsedIntent.categorySlug)
  ) {
    findings.push({
      ruleId: 'category_drift',
      severity: 'warn',
      message: `Expected ${persona.categorySlug}, got ${draft.parsedIntent.categorySlug}`,
      turn,
    });
  }

  const city =
    draft.parsedIntent.city ??
    String(draft.answers.location ?? '').split('،').pop()?.trim();
  if (city && persona.city && !String(city).includes(persona.city) && !persona.city.includes(String(city))) {
    findings.push({
      ruleId: 'location_wrong_city',
      severity: 'warn',
      message: `Expected city ${persona.city}, got ${city}`,
      turn,
    });
  }

  const active = result.activeFieldKey;
  if (
    active &&
    ctx.priorActiveFieldKey === active &&
    ctx.priorConfirmedCount === (result.confirmedCount ?? 0)
  ) {
    const count = (ctx.repeatFieldCounts.get(active) ?? 0) + 1;
    ctx.repeatFieldCounts.set(active, count);
    if (count >= 3) {
      findings.push({
        ruleId: 'repeat_question',
        severity: 'error',
        message: `Repeated question for ${active} (${count}x without progress)`,
        turn,
      });
    } else if (count === 2) {
      findings.push({
        ruleId: 'repeat_question',
        severity: 'warn',
        message: `Repeated question for ${active}`,
        turn,
      });
    }
  }

  if (result.offTopic && isRealEstateUserMessage(userMessage, persona)) {
    findings.push({
      ruleId: 'off_topic_false_positive',
      severity: 'error',
      message: 'Off-topic on valid real-estate message',
      turn,
    });
  }

  if (RAW_CHIP_PATTERN.test(userMessage)) {
    findings.push({
      ruleId: 'raw_chip_leak',
      severity: 'error',
      message: 'User message contains raw canonical slug',
      turn,
    });
  }

  if (
    deal === 'rent_rahn_ejare' &&
    result.readyToPreview &&
    !(result.confirmedFields?.includes('deposit') && result.confirmedFields?.includes('monthlyRent'))
  ) {
    findings.push({
      ruleId: 'rahn_ejare_incomplete',
      severity: 'error',
      message: 'Preview ready without deposit+monthlyRent for rahn_ejare',
      turn,
    });
  }

  if (/حدود/.test(userMessage) && draft.answers.areaMax && !draft.answers.areaMin) {
    findings.push({
      ruleId: 'area_approx_as_max',
      severity: 'warn',
      message: 'Approximate area stored as max only',
      turn,
    });
  }

  if (
    ctx.priorConfirmedCount === (result.confirmedCount ?? 0) &&
    !result.activeFieldKey &&
    !result.readyToPreview
  ) {
    findings.push({
      ruleId: 'stuck_no_active_field',
      severity: 'warn',
      message: 'No progress and no active field',
      turn,
    });
  }

  const fragment = extractLocationFragment(userMessage);
  const loc = String(draft.answers.location ?? '');
  if (fragment && fragment.length >= 6 && loc && !locationContainsFragment(loc, fragment)) {
    const lastTok = fragment.split(/\s+/).pop() ?? '';
    if (lastTok.length >= 3 && compactLocationText(loc).includes(compactLocationText(lastTok)) && !locationContainsFragment(loc, fragment)) {
      findings.push({
        ruleId: 'location_partial_token',
        severity: 'error',
        message: `Location ack uses partial token "${lastTok}" instead of "${fragment}"`,
        turn,
        detail: loc,
      });
    }
  }

  if (
    draft.parsedIntent.locationResolutionStatus === 'city_ambiguous' &&
    result.confirmedDelta?.includes('location')
  ) {
    findings.push({
      ruleId: 'location_cross_city_unasked',
      severity: 'error',
      message: 'Location confirmed while city still ambiguous',
      turn,
    });
  }

  if (
    /امام\s*خمینی|خیابان\s*آزادی|خیابان\s*فردوسی/i.test(userMessage) &&
    !/مشهد|تهران|اصفهان|شیراز|کرج|تبریز/.test(userMessage) &&
    draft.parsedIntent.neighborhoodSlug &&
    result.confirmedDelta?.includes('location')
  ) {
    findings.push({
      ruleId: 'location_generic_street',
      severity: 'error',
      message: 'Generic street resolved without city',
      turn,
    });
  }

  if (
    /نمی\s*خو(?:ام|واه)|نمیخو(?:ام|واه)/.test(userMessage) &&
    result.confirmedDelta?.includes('location')
  ) {
    findings.push({
      ruleId: 'location_ack_rejected',
      severity: 'error',
      message: 'Location confirmed on rejection message',
      turn,
    });
  }

  if (/انباری|انبار|سوله|پارکینگ/.test(userMessage) && result.offTopic) {
    findings.push({
      ruleId: 'property_off_topic_false',
      severity: 'error',
      message: 'Storage/industrial property marked off-topic',
      turn,
    });
  }

  const userStatedLocation =
    Boolean(extractLocationFragment(userMessage)) ||
    /(?:^|\s)(?:در|محله)\s+[^\s،]{2,}/.test(userMessage) ||
    /مشهد|تهران|اصفهان|شیراز|کرج|تبریز/.test(userMessage);

  if (
    result.confirmedDelta?.includes('location') &&
    !/^__hood__:|^__city__:/.test(userMessage.trim()) &&
    draft.parsedIntent.rejectLocationAutoConfirm &&
    !userStatedLocation &&
    ctx.priorActiveFieldKey !== 'location'
  ) {
    findings.push({
      ruleId: 'location_confirmed_without_user',
      severity: 'error',
      message: 'Location auto-confirmed without user chip or explicit confirm',
      turn,
    });
  }

  return findings;
}

function isRealEstateUserMessage(msg: string, persona: ConversationPersona): boolean {
  return /ملک|اجاره|رهن|ودیعه|مغازه|آپارت|ویلا|زمین|متر|خرید|فروش|مشهد|تهران|انباری|انبار|سوله|پارکینگ/.test(
    msg + persona.openingHint
  );
}

export function auditConversationEnd(
  draft: NeedDraft,
  persona: ConversationPersona,
  readyToPreview: boolean
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const publish = validateNeedDraftForPublish(draft);
  if (readyToPreview && !publish.success) {
    findings.push({
      ruleId: 'publish_gate_drift',
      severity: 'error',
      message: publish.errors.map((e) => e.message).join(' · '),
    });
  }
  if (readyToPreview) {
    const listing = composeListingFromDraft(draft);
    if (isGenericListingTitle(listing.title)) {
      findings.push({
        ruleId: 'generic_listing_title',
        severity: 'error',
        message: `Generic title: ${listing.title}`,
      });
    }
  }
  return findings;
}

export async function judgeHumanQuality(
  assistantMessage: string,
  activeFieldLabel: string | null
): Promise<{ score: number; finding?: AuditFinding }> {
  if (process.env.V2_CONV_QA_SKIP_JUDGE === '1') {
    return { score: 5 };
  }

  const health = await checkQwenIntakeHealth();
  if (!health.ok) {
    return { score: 4 };
  }

  const base = getNeedIntakeLlmBaseUrl();
  const prompt = `Rate 1-5 how natural and logical this Persian real-estate assistant question is for the field "${activeFieldLabel ?? 'general'}". Reply ONLY with a single digit 1-5.\n\nAssistant: ${assistantMessage}`;

  try {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3.5-2b',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 8,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { score: 4 };
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? '4';
    const score = Number(raw.match(/[1-5]/)?.[0] ?? 4);
    if (score < 4) {
      return {
        score,
        finding: {
          ruleId: 'human_quality',
          severity: 'warn',
          message: `Low human quality score ${score}/5`,
          detail: assistantMessage.slice(0, 120),
        },
      };
    }
    return { score };
  } catch {
    return { score: 4 };
  }
}

export function clusterFindings(
  findings: AuditFinding[]
): Array<{ ruleId: string; count: number; samples: string[] }> {
  const map = new Map<string, { count: number; samples: string[] }>();
  for (const f of findings) {
    const cur = map.get(f.ruleId) ?? { count: 0, samples: [] };
    cur.count++;
    if (cur.samples.length < 3) cur.samples.push(f.message);
    map.set(f.ruleId, cur);
  }
  return [...map.entries()]
    .map(([ruleId, v]) => ({ ruleId, count: v.count, samples: v.samples }))
    .sort((a, b) => b.count - a.count);
}

import type { NeedDraft } from '@/contracts/need-intake';
import { JOB_ROLE_LABELS } from '@/config/need-schemas/labels';
import { draftToLegacyPayload } from '@/intake/legacy/draftToLegacyPayload';

export interface JobsServicesCopyBlock {
  headline?: string;
  body?: string;
  bullets?: string[];
}

function needNarrative(draft: NeedDraft): string {
  const { parsedIntent } = draftToLegacyPayload(draft);
  return (draft.sourceText ?? parsedIntent.rawText ?? '').trim();
}

export function buildServiceListingCopyTemplate(draft: NeedDraft): JobsServicesCopyBlock {
  const { parsedIntent, answers } = draftToLegacyPayload(draft);
  const city = String(answers.city ?? parsedIntent.city ?? '').trim();
  const serviceType = String(
    answers.serviceType ?? parsedIntent.entities?.serviceKind ?? parsedIntent.categorySlug ?? ''
  ).trim();

  return {
    headline: city ? `\u0646\u06CC\u0627\u0632 \u062E\u062F\u0645\u0627\u062A \u062F\u0631 ${city}` : '\u0646\u06CC\u0627\u0632 \u062E\u062F\u0645\u0627\u062A',
    body: needNarrative(draft),
    bullets: serviceType ? [serviceType] : undefined,
  };
}

export function buildJobListingCopyTemplate(draft: NeedDraft): JobsServicesCopyBlock {
  const { parsedIntent, answers } = draftToLegacyPayload(draft);
  const city = String(answers.city ?? parsedIntent.city ?? '').trim();
  const jobTitle = String(answers.jobTitle ?? parsedIntent.entities?.jobTitle ?? '').trim();
  const roleType = String(answers.roleType ?? parsedIntent.entities?.roleType ?? '').trim();
  const roleFa = roleType ? (JOB_ROLE_LABELS[roleType] ?? roleType) : '';

  return {
    headline:
      jobTitle ||
      (roleFa ? `\u0641\u0631\u0635\u062A \u0634\u063A\u0644\u06CC: ${roleFa}` : '\u0641\u0631\u0635\u062A \u0634\u063A\u0644\u06CC'),
    body: needNarrative(draft),
    bullets: [city, roleFa].filter(Boolean),
  };
}

export function jobsServicesCopyToDescription(block: JobsServicesCopyBlock): string {
  const parts: string[] = [];
  if (block.headline?.trim()) parts.push(block.headline.trim());
  if (block.body?.trim()) parts.push(block.body.trim());
  if (block.bullets?.length) {
    parts.push(block.bullets.map((b) => b.trim()).filter(Boolean).join('\u060C '));
  }
  return parts.join(' ').trim();
}

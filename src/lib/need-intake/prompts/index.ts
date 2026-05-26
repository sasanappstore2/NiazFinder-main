import { getRootCategorySlug } from '@/config/need-schemas/resolve-schema';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { buildPropertyParseSystemPrompt } from './property';
import { buildVehicleParseSystemPrompt } from './vehicle';
import { buildProductParseSystemPrompt } from './product';
import { buildServicesParseSystemPrompt } from './services';
import { buildJobsParseSystemPrompt } from './jobs';
import { buildNeedIntakeParseSystemPrompt } from '@/lib/need-intake/ai-prompts';
import { INTENT_LIST, CITY_LIST, JSON_OUTPUT_RULES } from './base';

export type ParseVertical =
  | 'real-estate'
  | 'vehicles'
  | 'electronics'
  | 'home-appliances'
  | 'personal-items'
  | 'entertainment'
  | 'services'
  | 'jobs'
  | 'social'
  | 'general';

export function detectParseVertical(categorySlug: string): ParseVertical {
  const root = getRootCategorySlug(categorySlug) as ParseVertical;
  if (
    root === 'real-estate' ||
    categorySlug.includes('apartment') ||
    categorySlug.includes('rent') ||
    categorySlug.includes('villa') ||
    categorySlug.includes('land-sale')
  ) {
    return 'real-estate';
  }
  if (root === 'vehicles' || categorySlug.startsWith('car')) return 'vehicles';
  if (root === 'jobs') return 'jobs';
  if (
    root === 'electronics' ||
    root === 'home-appliances' ||
    root === 'personal-items' ||
    root === 'entertainment'
  ) {
    return root;
  }
  if (root === 'services') return 'services';
  if (root === 'social') return 'social';
  return 'general';
}

/** Pick compact system prompt from rule-based category hint (before LLM). */
export function buildVerticalParseSystemPrompt(categorySlug: string): string {
  const vertical = detectParseVertical(categorySlug);
  switch (vertical) {
    case 'real-estate':
      return buildPropertyParseSystemPrompt();
    case 'vehicles':
      return buildVehicleParseSystemPrompt();
    case 'electronics':
    case 'home-appliances':
    case 'personal-items':
    case 'entertainment':
      return buildProductParseSystemPrompt();
    case 'jobs':
      return buildJobsParseSystemPrompt();
    case 'services':
      return buildServicesParseSystemPrompt();
    case 'social':
      return `Persian social/help requests. intentType: help_request | general. categorySlug: social, lost-found, volunteering.
${JSON_OUTPUT_RULES}`;
    default:
      return buildNeedIntakeParseSystemPrompt();
  }
}

/** Hint vertical from raw text using rule parser. */
export function guessVerticalFromText(text: string): ParseVertical {
  const rules = parseIntentFromText(text);
  return detectParseVertical(rules.categorySlug);
}

export function buildParseSystemPromptForText(text: string): string {
  return buildVerticalParseSystemPrompt(guessVerticalFromText(text));
}

export { INTENT_LIST, CITY_LIST };

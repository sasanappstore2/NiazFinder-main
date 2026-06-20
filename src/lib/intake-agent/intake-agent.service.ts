import type { IntakeDomain } from '@prisma/client';
import {
  fetchIntakeRulesForCategory,
  getCategoryRouteById,
  getCategoryRouteBySlug,
  listCategoryRoutes,
  queryIntakeRulesVector,
  searchCategoryRoutesVector,
} from '@/lib/intake-agent/intake-vector-search';
import { validateAgainstConstraints, validateAndFillIntake } from '@/lib/intake-agent/intake-rule-validator';
import type {
  CategoryRouteHit,
  IntakeIntent,
  IntakeRuleHit,
  IntakeRulesBundle,
  TechnicalConstraints,
  ValidateIntakeInput,
  ValidateIntakeResult,
} from '@/lib/intake-agent/types';

const BUSINESS_HINTS = [
  'offer',
  'provide',
  'service provider',
  'business',
  'company',
  'professional',
  'پیشنهاد',
  'ارائه',
  '????? ??\u200c???',
  '???\u200c????',
  '?????',
  '???? ?????',
];

const NEEDS_HINTS = [
  'need',
  'looking for',
  'want',
  'request',
  'hire',
  'find',
  '??\u200c?????',
  '??????',
  '????',
  '?????',
  '???????',
  '???????',
  '?????',
  '????',
  '????\u200c???',
];

export class IntakeAgentService {
  /**
   * Disambiguate user intent: offering a service (BUSINESS) vs seeking one (NEEDS).
   * Returns UNKNOWN when ambiguous — caller should ask the clarifying question.
   */
  detectIntent(text: string): IntakeIntent {
    const lower = text.toLowerCase();
    let businessScore = 0;
    let needsScore = 0;

    for (const hint of BUSINESS_HINTS) {
      if (lower.includes(hint.toLowerCase())) businessScore += 1;
    }
    for (const hint of NEEDS_HINTS) {
      if (lower.includes(hint.toLowerCase())) needsScore += 1;
    }

    if (businessScore > 0 && needsScore === 0) return 'BUSINESS';
    if (needsScore > 0 && businessScore === 0) return 'NEEDS';
    if (businessScore > needsScore) return 'BUSINESS';
    if (needsScore > businessScore) return 'NEEDS';
    return 'UNKNOWN';
  }

  /** Tool: search_categories — L1 semantic routing. */
  async searchCategories(args: {
    keyword: string;
    domain: IntakeDomain;
    parentSlug?: string;
    limit?: number;
  }): Promise<CategoryRouteHit[]> {
    return searchCategoryRoutesVector(args);
  }

  /** Tool: get_categories — hierarchical tree traversal (no vector). */
  async getCategories(args: {
    domain: IntakeDomain;
    parentSlug?: string | null;
    limit?: number;
  }): Promise<CategoryRouteHit[]> {
    return listCategoryRoutes(args);
  }

  /** Tool: fetch_intake_rules — minimal rule bundle for form filling. */
  async fetchIntakeRules(args: {
    domain: IntakeDomain;
    categoryId?: string;
    categorySlug?: string;
  }): Promise<IntakeRulesBundle | null> {
    let route: CategoryRouteHit | null = null;

    if (args.categoryId) {
      route = await getCategoryRouteById(args.categoryId);
    } else if (args.categorySlug) {
      route = await getCategoryRouteBySlug(args.domain, args.categorySlug);
    }

    if (!route) return null;

    const rules = await fetchIntakeRulesForCategory({
      domain: route.domain,
      categorySlug: route.slug,
    });

    const requirementRules = rules.filter((r) => r.bundleType === 'requirement');
    const matchRulesSample = rules.filter((r) => r.bundleType !== 'requirement');

    return {
      domain: route.domain,
      categorySlug: route.slug,
      categoryId: route.categoryId,
      title: route.title,
      description: route.description,
      technicalConstraints: route.technicalConstraints,
      requirementRules,
      matchRulesSample,
    };
  }

  /** Tool: query_intake_rules — L2 filtered vector search within a category. */
  async queryIntakeRules(args: {
    query: string;
    domain: IntakeDomain;
    categorySlug: string;
    bundleTypes?: string[];
    limit?: number;
  }): Promise<IntakeRuleHit[]> {
    return queryIntakeRulesVector(args);
  }

  /** Tool: validate_and_fill_intake — validate gathered form data against category rules. */
  async validateAndFillIntake(input: ValidateIntakeInput): Promise<ValidateIntakeResult> {
    return validateAndFillIntake(input);
  }

  /** Validate with explicit constraints (e.g. from fetched rules). */
  validateData(
    data: Record<string, unknown>,
    constraints: TechnicalConstraints,
  ): ValidateIntakeResult {
    return validateAgainstConstraints(data, constraints);
  }

  /** Full agentic intake session helper: route → fetch minimal rules → optional scoped query. */
  async startIntakeSession(args: {
    userMessage: string;
    domain?: IntakeDomain;
    categoryKeyword?: string;
  }): Promise<{
    intent: IntakeIntent;
    domain: IntakeDomain | null;
    categories: CategoryRouteHit[];
    rulesBundle: IntakeRulesBundle | null;
    clarifyingQuestion?: string;
  }> {
    const intent = args.domain ? args.domain : this.detectIntent(args.userMessage);
    if (intent === 'UNKNOWN') {
      return {
        intent,
        domain: null,
        categories: [],
        rulesBundle: null,
        clarifyingQuestion:
          'Are you offering a service (Business) or looking for one (Need)? \u0622\u06CC\u0627 \u062E\u062F\u0645\u0627\u062A \u0627\u0631\u0627\u0626\u0647 \u0645\u06CC\u200c\u062F\u0647\u06CC\u062F \u06CC\u0627 \u0628\u0647 \u062F\u0646\u0628\u0627\u0644 \u062E\u062F\u0645\u0627\u062A \u0647\u0633\u062A\u06CC\u062F\u061f',
      };
    }

    const domain = intent as IntakeDomain;
    const keyword = args.categoryKeyword?.trim() || args.userMessage.trim();
    const categories = await this.searchCategories({ keyword, domain, limit: 5 });

    const top = categories[0];
    const rulesBundle = top
      ? await this.fetchIntakeRules({ domain, categorySlug: top.slug })
      : null;

    return { intent, domain, categories, rulesBundle };
  }
}

export const intakeAgentService = new IntakeAgentService();

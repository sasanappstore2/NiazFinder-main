import type { IntakeDomain } from '@prisma/client';
import { intakeAgentService } from '@/lib/intake-agent/intake-agent.service';

export type IntakeAgentToolName =
  | 'search_categories'
  | 'get_categories'
  | 'fetch_intake_rules'
  | 'query_intake_rules'
  | 'validate_and_fill_intake';

export const INTAKE_AGENT_TOOLS = [
  {
    name: 'search_categories',
    description:
      'Level-1 semantic routing: find relevant category paths for intake. Use after determining domain (NEEDS or BUSINESS).',
    parameters: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: 'User query or service description' },
        domain: { type: 'string', enum: ['NEEDS', 'BUSINESS'] },
        parentSlug: { type: 'string', description: 'Optional parent slug to narrow hierarchy' },
        limit: { type: 'number', minimum: 1, maximum: 20 },
      },
      required: ['keyword', 'domain'],
    },
  },
  {
    name: 'get_categories',
    description:
      'List child categories under a parent (hierarchical traversal). Use parentSlug=null for top-level sections.',
    parameters: {
      type: 'object',
      properties: {
        domain: { type: 'string', enum: ['NEEDS', 'BUSINESS'] },
        parentSlug: { type: ['string', 'null'] },
        limit: { type: 'number', minimum: 1, maximum: 200 },
      },
      required: ['domain'],
    },
  },
  {
    name: 'fetch_intake_rules',
    description:
      'Retrieve the minimal intake rule bundle for a category (required fields + sample match rules). Call once per intake session.',
    parameters: {
      type: 'object',
      properties: {
        domain: { type: 'string', enum: ['NEEDS', 'BUSINESS'] },
        categoryId: { type: 'string', description: 'IntakeCategoryRoute id from search_categories' },
        categorySlug: { type: 'string', description: 'Alternative to categoryId' },
      },
      required: ['domain'],
    },
  },
  {
    name: 'query_intake_rules',
    description:
      'Level-2 scoped vector search within a category. Always pass categorySlug — filters metadata before similarity.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        domain: { type: 'string', enum: ['NEEDS', 'BUSINESS'] },
        categorySlug: { type: 'string' },
        bundleTypes: {
          type: 'array',
          items: { type: 'string', enum: ['match', 'negative', 'requirement'] },
        },
        limit: { type: 'number', minimum: 1, maximum: 50 },
      },
      required: ['query', 'domain', 'categorySlug'],
    },
  },
  {
    name: 'validate_and_fill_intake',
    description:
      'Validate gathered intake data against category technical_constraints. Returns missing fields and normalized values.',
    parameters: {
      type: 'object',
      properties: {
        domain: { type: 'string', enum: ['NEEDS', 'BUSINESS'] },
        categorySlug: { type: 'string' },
        data: { type: 'object', additionalProperties: true },
      },
      required: ['domain', 'categorySlug', 'data'],
    },
  },
] as const;

export async function executeIntakeAgentTool(
  name: IntakeAgentToolName,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case 'search_categories':
      return intakeAgentService.searchCategories({
        keyword: String(args.keyword ?? ''),
        domain: args.domain as IntakeDomain,
        parentSlug: args.parentSlug ? String(args.parentSlug) : undefined,
        limit: typeof args.limit === 'number' ? args.limit : undefined,
      });

    case 'get_categories':
      return intakeAgentService.getCategories({
        domain: args.domain as IntakeDomain,
        parentSlug:
          args.parentSlug === null || args.parentSlug === undefined
            ? null
            : String(args.parentSlug),
        limit: typeof args.limit === 'number' ? args.limit : undefined,
      });

    case 'fetch_intake_rules':
      return intakeAgentService.fetchIntakeRules({
        domain: args.domain as IntakeDomain,
        categoryId: args.categoryId ? String(args.categoryId) : undefined,
        categorySlug: args.categorySlug ? String(args.categorySlug) : undefined,
      });

    case 'query_intake_rules':
      return intakeAgentService.queryIntakeRules({
        query: String(args.query ?? ''),
        domain: args.domain as IntakeDomain,
        categorySlug: String(args.categorySlug ?? ''),
        bundleTypes: Array.isArray(args.bundleTypes)
          ? args.bundleTypes.map(String)
          : undefined,
        limit: typeof args.limit === 'number' ? args.limit : undefined,
      });

    case 'validate_and_fill_intake':
      return intakeAgentService.validateAndFillIntake({
        domain: args.domain as IntakeDomain,
        categorySlug: String(args.categorySlug ?? ''),
        data: (args.data as Record<string, unknown>) ?? {},
      });

    default:
      throw new Error(`Unknown intake agent tool: ${name}`);
  }
}

export const INTAKE_AGENT_SYSTEM_PROMPT = `You are the Smart Intake Assistant for NiazFinder.

## Domain routing (required first step)
- domain:NEEDS — user is looking for a service (service request / need listing).
- domain:BUSINESS — user is offering a service (business profile / professional capability).

If intent is unclear, ask: "Are you offering a service (Business) or looking for one (Need)?"

## Tiered RAG workflow
1. Determine domain (NEEDS vs BUSINESS).
2. search_categories(keyword, domain) — Level 1 routing (~500 categories).
3. get_categories(domain, parentSlug) — drill down hierarchy if needed.
4. fetch_intake_rules(domain, categorySlug) — load MINIMAL validation bundle only.
5. Gather fields conversationally from technical_constraints.requiredFields.
6. query_intake_rules(query, domain, categorySlug) — only when user text needs deeper rule matching.
7. validate_and_fill_intake(domain, categorySlug, data) — before submit.

Never load all rules. Always filter by categorySlug before vector search.`;

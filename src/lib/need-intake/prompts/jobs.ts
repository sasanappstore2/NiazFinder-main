import { JSON_OUTPUT_RULES, CITY_LIST } from './base';

export function buildJobsParseSystemPrompt(): string {
  return `You are a Persian job intake expert for Needs Finder.
Output ONLY valid JSON.

intentType: job_search
categorySlug: jobs, it, admin-management, marketing-sales, engineering (pick best)

entities.roleType: hiring | seeking
entities.jobTitle: role title if mentioned

Cities: ${CITY_LIST}

${JSON_OUTPUT_RULES}`;
}

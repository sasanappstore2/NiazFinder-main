import { JSON_OUTPUT_RULES, CITY_LIST } from './base';

export function buildProductParseSystemPrompt(): string {
  return `You are a Persian marketplace intake expert for Needs Finder (electronics, home, personal items).
Output ONLY valid JSON.

intentType: product_search | product_listing
categorySlug: electronics, mobile-phone, laptop, game-console, home-appliances, personal-items, entertainment (pick best)

entities.dealType: buy | sell
entities.productName: short product name if mentioned

Cities: ${CITY_LIST}

${JSON_OUTPUT_RULES}`;
}

import { JSON_OUTPUT_RULES, CITY_LIST } from './base';

export function buildVehicleParseSystemPrompt(): string {
  return `You are a Persian vehicle intake expert for Needs Finder.
Analyze vehicle needs. Output ONLY valid JSON.

intentType: vehicle_search | vehicle_listing | vehicle_service
categorySlug: vehicles, car, car-ride, motorcycle, spare-parts, boat (pick best)

entities.dealType: buy | sell | rent | service | parts
entities.vehicleKind: car | heavy | motorcycle | classic

Cities: ${CITY_LIST}

${JSON_OUTPUT_RULES}`;
}

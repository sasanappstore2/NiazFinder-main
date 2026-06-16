/**
 * Schema Evolution Layer v1 self-test.
 * Run: npm run test:schema-evolution-proposals
 */
import { analyzeSchemaIntelligence, generateSchemaEvolutionProposal } from '@/intake/intelligence/schemaIntelligenceEngine';
import { resolveTemplate } from '@/intake/template/resolveTemplate';
import { rankProposals } from '@/intake/evolution/proposalRanker';
import { clearProposalStore } from '@/intake/evolution/proposalStore';
import {
  buildResidentialRentTelemetryFixture,
  RESIDENTIAL_RENT_CATEGORY_SLUG,
  RESIDENTIAL_RENT_TEMPLATE_ID,
} from '@/intake/fixtures/post-intake-telemetry-fixtures';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function snapshotTemplate(categorySlug: string): string {
  const t = resolveTemplate({ categorySlug, subcategorySlug: categorySlug });
  return JSON.stringify({
    id: t.id,
    sections: t.sections,
    requiredFields: t.requiredFields,
    fieldMapKeys: Object.keys(t.fieldMap).sort(),
  });
}

async function main(): Promise<void> {
  clearProposalStore();

  const events = buildResidentialRentTelemetryFixture();
  const insights = analyzeSchemaIntelligence(events, {
    templateId: RESIDENTIAL_RENT_TEMPLATE_ID,
    categorySlug: RESIDENTIAL_RENT_CATEGORY_SLUG,
    sinceDays: 7,
  });

  const before = snapshotTemplate(RESIDENTIAL_RENT_CATEGORY_SLUG);

  const proposal = await generateSchemaEvolutionProposal(insights);

  const after = snapshotTemplate(RESIDENTIAL_RENT_CATEGORY_SLUG);
  assert(before === after, 'resolveTemplate snapshot must not change');

  assert(proposal.templateId === RESIDENTIAL_RENT_TEMPLATE_ID, 'templateId');
  assert(proposal.suggestedFieldsToAdd.includes('parking'), 'parking add suggestion');
  assert(proposal.confidenceScore > 0, 'confidenceScore');
  assert(proposal.rationale.length > 0, 'rationale');
  assert(
    proposal.impactEstimate.bottleneckStep === 'location',
    `bottleneck location, got ${proposal.impactEstimate.bottleneckStep}`
  );

  const ranked = rankProposals([proposal, { ...proposal, id: 'b-copy', confidenceScore: 0.1 }]);
  assert(ranked[0]!.id === proposal.id, 'higher confidence proposal ranks first');

  const rankedAgain = rankProposals([proposal, { ...proposal, id: 'b-copy', confidenceScore: 0.1 }]);
  assert(ranked[0]!.id === rankedAgain[0]!.id, 'ranking stability');

  assert(insights.driftSignals.length > 0, 'insights unchanged by evolution hook');
  assert(insights.templateId === RESIDENTIAL_RENT_TEMPLATE_ID, 'insights output intact');

  console.log('schema-evolution-proposals self-test: 10/10 passed');
}

void main();

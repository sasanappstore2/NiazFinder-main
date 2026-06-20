/**
 * Smoke test for IntakeAgentService tiered RAG (requires migrated DB + indexed categories).
 * Run: npm run test:intake-agent
 */
import { intakeAgentService } from '../../src/lib/intake-agent/intake-agent.service';

async function main() {
  const intent = intakeAgentService.detectIntent('می‌خواهم لوله‌کشی تعمیر کنم');
  console.log('intent:', intent);
  if (intent !== 'NEEDS') {
    console.warn('Expected NEEDS intent for repair request');
  }

  const session = await intakeAgentService.startIntakeSession({
    userMessage: 'تعمیر لوله‌کشی در تهران',
    domain: 'NEEDS',
  });
  console.log('session categories:', session.categories.slice(0, 3).map((c) => c.slug));

  if (session.categories[0]) {
    const bundle = await intakeAgentService.fetchIntakeRules({
      domain: 'NEEDS',
      categorySlug: session.categories[0].slug,
    });
    console.log('rules bundle:', {
      slug: bundle?.categorySlug,
      required: (bundle?.technicalConstraints as { requiredFields?: string[] })?.requiredFields,
      requirementRules: bundle?.requirementRules.length,
      matchSample: bundle?.matchRulesSample.length,
    });

    const validation = await intakeAgentService.validateAndFillIntake({
      domain: 'NEEDS',
      categorySlug: session.categories[0].slug,
      data: { dealType: 'service', city: 'تهران' },
    });
    console.log('validation:', { valid: validation.valid, missing: validation.missing });
  }

  console.log('intake agent smoke OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

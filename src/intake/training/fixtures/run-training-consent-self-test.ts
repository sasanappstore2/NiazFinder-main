import { captureTrainingExample } from '@/intake/training/captureTrainingExample';

const draft = {
  templateId: 'consent-self-test',
  sourceText: 'test-only need text',
  entities: {},
};

const missingConsent = await captureTrainingExample({ draft, serviceRequestId: 'consent-self-test' });
if (missingConsent !== null) throw new Error('capture must skip when consent is missing');

const malformedConsent = await captureTrainingExample({
  draft,
  serviceRequestId: 'consent-self-test',
  trainingConsent: { actorUserId: '', policyVersion: '', grantedAt: 'invalid' },
});
if (malformedConsent !== null) throw new Error('capture must skip malformed consent');

console.log('training consent capture guard: ok');

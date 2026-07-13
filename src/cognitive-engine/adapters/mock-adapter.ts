/**
 * RFC-002 Part 11 §111 — "The Cognitive Engine SHALL support testing without AI." This adapter
 * satisfies that requirement as an actual artifact, not just a principle: it implements the same
 * `EvidenceProvider` signature as the real adapter but returns canned Evidence with zero network
 * calls, zero latency, and zero model-flakiness. Anything downstream (Grounding, Decision Engine,
 * CNO, Cognitive State, Readiness) can be tested deterministically by swapping this in — proving
 * AI is genuinely a replaceable, isolated dependency (ADR-052), not something business logic
 * secretly depends on.
 */
import type { Evidence } from '@/cognitive-engine/types/evidence';
import type { CognitiveContract, EvidenceProvider } from '@/cognitive-engine/types/cognitive-contract';

export function createMockEvidenceProvider(evidence: Evidence[]): EvidenceProvider {
  return async (): Promise<CognitiveContract> => ({
    evidence,
    diagnostics: {
      provider: 'mock',
      model: 'mock-fixture',
      promptVersion: 'n/a',
      latencyMs: 0,
      retryCount: 0,
      parsingStatus: 'ok',
    },
  });
}

/**
 * Diagnostics — RFC-002 Part 11 §107. Operational metadata about one AI execution.
 * Diagnostics are operational, never semantic — they never influence business decisions,
 * only observability/debugging.
 */
export interface Diagnostics {
  provider: string;
  model: string;
  promptVersion: string;
  latencyMs: number;
  retryCount: number;
  parsingStatus: 'ok' | 'empty' | 'invalid-json' | 'schema-mismatch';
}

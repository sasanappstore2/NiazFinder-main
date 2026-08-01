/**
 * Calm compose UX invariants (RFC-0004).
 * No ambiguity/verify prompt theater required — refuse-to-write instead.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const panelPath = join(process.cwd(), 'src/components/need-intake/NeedIntakePanel.tsx');
const panel = readFileSync(panelPath, 'utf8');

assert.equal(panel.includes('IntakeLocationAmbiguityPrompt'), false, 'no location ambiguity theater');
assert.equal(panel.includes('IntakeAgentVerificationCard'), false, 'no verify theater');
assert.equal(panel.includes('IntakeGapClarificationPrompt'), false, 'no gap clarification theater');
assert.ok(panel.includes('sanitizeDraftForComposeAutoApply'), 'uses draft sanitize');
assert.ok(panel.includes('cityLockedByUser'), 'analyze scope respects user lock');

console.log('test:intake-calm-ux OK');

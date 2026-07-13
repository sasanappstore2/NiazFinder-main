import { mkdir } from 'node:fs/promises';
import { appendFile } from 'node:fs';
import { join } from 'node:path';
import type { SchemaEvolutionProposal } from '@/intake/evolution/proposalTypes';

const MAX_PROPOSALS_PER_TEMPLATE = 100;

const store = new Map<string, SchemaEvolutionProposal[]>();

function defaultEvolutionDir(): string {
  return (
    process.env.POST_INTAKE_EVOLUTION_DIR?.trim() ||
    join(process.cwd(), 'data', 'evolution', 'schema-proposals')
  );
}

export function isSchemaEvolutionFileEnabled(): boolean {
  const raw = process.env.POST_INTAKE_EVOLUTION_FILE_ENABLED;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return process.env.NODE_ENV !== 'production';
}

function dateFileName(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}.jsonl`;
}

function appendProposalToFile(proposal: SchemaEvolutionProposal): void {
  if (!isSchemaEvolutionFileEnabled()) return;

  const dir = defaultEvolutionDir();
  const filePath = join(dir, dateFileName());
  const line = JSON.stringify(proposal) + '\n';

  setImmediate(() => {
    void (async () => {
      try {
        await mkdir(dir, { recursive: true });
        await new Promise<void>((resolve, reject) => {
          appendFile(filePath, line, 'utf8', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } catch (error) {
        console.warn('[schema-evolution] file append failed:', error);
      }
    })();
  });
}

/** Persist proposal in memory (ring per template) + optional JSONL. Non-throwing. */
export function persistProposal(proposal: SchemaEvolutionProposal): void {
  const list = store.get(proposal.templateId) ?? [];
  list.push(proposal);
  while (list.length > MAX_PROPOSALS_PER_TEMPLATE) list.shift();
  store.set(proposal.templateId, list);
  appendProposalToFile(proposal);
}

export function getStoredProposals(templateId: string): SchemaEvolutionProposal[] {
  return [...(store.get(templateId) ?? [])];
}

/** Test-only reset. */
export function clearProposalStore(): void {
  store.clear();
}

#!/usr/bin/env npx tsx
/**
 * Ingest Divar research titles into labeled fixtures (rules teacher gate).
 *
 * Run after: npm run divar:research-all
 */
import { ingestWebTitlesFromResearch } from '@/lib/need-intake/dataset/ingest-web-titles';
import { exportFixturesToFile } from '@/lib/need-intake/dataset/export-jsonl';
import { join } from 'node:path';

const target = Number(process.env.WEB_INGEST_TARGET ?? 3000);
const fixtures = ingestWebTitlesFromResearch({ targetCount: target });
const outPath = join(process.cwd(), 'data', 'need-intake-training', 'need-intake-web-ingest.jsonl');
exportFixturesToFile(fixtures, outPath);

console.log(`Ingested ${fixtures.length} web titles → ${outPath}`);

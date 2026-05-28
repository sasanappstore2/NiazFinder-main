import { NextResponse } from 'next/server';
import { fixturesToJsonl } from '@/lib/need-intake/dataset/export-jsonl';
import { isNeedIntakeDevToolsEnabled } from '@/lib/need-intake/dataset/dev-guard';
import { DATASET_FIXTURES } from '@/lib/need-intake/fixtures/dataset-cases';

export async function POST() {
  if (!isNeedIntakeDevToolsEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = fixturesToJsonl(DATASET_FIXTURES);
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Content-Disposition': 'attachment; filename="need-intake-train.jsonl"',
    },
  });
}

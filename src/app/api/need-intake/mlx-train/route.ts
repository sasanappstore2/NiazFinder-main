import { NextResponse } from 'next/server';
import { getNeedIntakeLlmBaseUrl } from '@/lib/need-intake/llm-parse-client';
import { isNeedIntakeDevToolsEnabled } from '@/lib/need-intake/dataset/dev-guard';

export async function POST() {
  if (!isNeedIntakeDevToolsEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    const res = await fetch(`${getNeedIntakeLlmBaseUrl()}/train`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'intake-mlx unreachable' },
      { status: 503 }
    );
  }
}

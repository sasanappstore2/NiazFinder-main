import { NextResponse } from 'next/server';

/** V2 intake chat frozen until post-launch copilot-on-form redesign. */
export async function POST() {
  return NextResponse.json(
    { error: 'چت آزمایشی موقتاً غیرفعال است. لطفاً از فرم ثبت نیاز در /post استفاده کنید.' },
    { status: 503 }
  );
}

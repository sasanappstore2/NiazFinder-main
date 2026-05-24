import { NextRequest, NextResponse } from 'next/server';
import { loadBusinessByUserId } from '@/lib/business/load-profile';
import { runBusinessAssistant, buildLlmSystemPrompt } from '@/lib/business/ai-assistant';
import type { AssistantChatRequest } from '@/contracts/business-profile';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as AssistantChatRequest;

    if (!body.messages?.length) {
      return NextResponse.json({ error: 'پیام الزامی است' }, { status: 400 });
    }

    const business = await loadBusinessByUserId(id);
    if (!business) {
      return NextResponse.json({ error: 'کسب‌وکار یافت نشد' }, { status: 404 });
    }

    const response = runBusinessAssistant(business, { ...body, businessId: id });

    return NextResponse.json({
      ...response,
      _meta: {
        systemPromptPreview: buildLlmSystemPrompt(business).slice(0, 500),
        provider: 'rule-based',
      },
    });
  } catch (error) {
    console.error('Business assistant error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

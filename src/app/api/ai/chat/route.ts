import { handleAiChatPost } from '@/lib/ai-agent/route-handler';

export async function POST(request: Request) {
  return handleAiChatPost(request as import('next/server').NextRequest);
}

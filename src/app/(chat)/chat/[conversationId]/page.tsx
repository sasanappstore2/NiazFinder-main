'use client';

import { ChatPanel } from '@/components/chat/ChatPanel';
import { use } from 'react';

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

export default function ConversationPage({ params }: ConversationPageProps) {
  const { conversationId } = use(params);

  return <ChatPanel conversationId={conversationId} />;
}

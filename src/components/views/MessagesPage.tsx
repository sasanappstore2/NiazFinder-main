'use client';
import { ChatPanel } from '@/components/chat/ChatPanel';

export default function MessagesPage() {
  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <ChatPanel />
    </div>
  );
}

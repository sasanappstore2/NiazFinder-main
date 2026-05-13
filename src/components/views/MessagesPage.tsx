'use client';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { ChatPanel } from '@/components/chat/ChatPanel';

export default function MessagesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-2 pb-12" style={{ height: 'calc(100vh - 80px)' }}>
      <Breadcrumb /><Separator className="my-4" /><ChatPanel />
    </div>
  );
}

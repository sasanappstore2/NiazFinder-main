'use client';

import { AdminPageShell } from '@/components/admin/ui';
import { ChatReviewPanel } from '@/components/admin/chat-review/ChatReviewPanel';

export function MessagesPanel() {
  return (
    <AdminPageShell section="messages" layout="table" description="مشاهده و بازبینی گفتگوهای کاربران">
      <div className="admin-content-zone p-4">
        <ChatReviewPanel />
      </div>
    </AdminPageShell>
  );
}

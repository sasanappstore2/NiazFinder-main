'use client';

import { NotificationsPanel } from '@/components/chat/NotificationsPanel';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';

export default function NotificationsPage() {
  return (
    <div dir="rtl" className="max-w-3xl mx-auto px-4 pt-2 pb-12">
      <Breadcrumb />
      <Separator className="my-4" />
      <NotificationsPanel />
    </div>
  );
}

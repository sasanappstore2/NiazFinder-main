'use client';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { NotificationSettings } from '@/components/dashboard/NotificationSettings';

export default function NotificationSettingsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-2 pb-12">
      <Breadcrumb /><Separator className="my-4" /><NotificationSettings />
    </div>
  );
}

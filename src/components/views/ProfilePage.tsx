'use client';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { UserDashboard } from '@/components/dashboard/UserDashboard';

export default function ProfilePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 pt-2 pb-12">
      <Breadcrumb /><Separator className="my-4" /><UserDashboard />
    </div>
  );
}

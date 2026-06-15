'use client';

import { AdminPageShell } from '@/components/admin/ui';
import { RbacManager } from '@/components/admin/rbac/RbacManager';
import { IntakeOpsPanel } from '@/components/admin/modules/IntakeOpsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function SystemPanel() {
  return (
    <AdminPageShell section="system" layout="form" description={'\u0645\u062f\u06cc\u0631\u06cc\u062a \u0646\u0642\u0634\u200c\u0647\u0627\u060c \u0645\u062c\u0648\u0632\u0647\u0627 \u0648 \u0639\u0645\u0644\u06cc\u0627\u062a intake'}>
      <Tabs defaultValue="rbac">
        <TabsList>
          <TabsTrigger value="rbac">{'\u0646\u0642\u0634\u200c\u0647\u0627 \u0648 \u062f\u0633\u062a\u0631\u0633\u06cc'}</TabsTrigger>
          <TabsTrigger value="intake-ops">{'Intake Ops'}</TabsTrigger>
        </TabsList>
        <TabsContent value="rbac" className="mt-4">
          <div className="admin-content-zone rounded-xl border border-(--color-cardBorder) bg-(--color-primaryBg) p-4">
            <RbacManager />
          </div>
        </TabsContent>
        <TabsContent value="intake-ops" className="mt-4">
          <IntakeOpsPanel />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}

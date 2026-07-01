'use client';

import { Lock } from 'lucide-react';
import { useAdmin } from '@/components/admin/context/AdminContext';
import { ADMIN_SECTION_PERMISSIONS, canAccessAdminSection, type AdminSectionId } from '@/config/admin-routes';
import { OverviewPanel } from './OverviewPanel';
import { AnalyticsShell } from '@/components/admin/analytics/AnalyticsShell';
import { WorkflowPanel } from './WorkflowPanel';
import { CategoriesPanel } from './CategoriesPanel';
import { BusinessOccupationsPanel } from './BusinessOccupationsPanel';
import { OnlineStoresPanel } from './OnlineStoresPanel';
import { LocationsPanel } from './CategoriesLocationsPanels';
import { UsersPanel } from './UsersPanel';
import { RequestsPanel } from './RequestsPanel';
import { ProposalsPanel } from './ProposalsPanel';
import { BusinessesPanel } from './BusinessesPanel';
import { FilingsPanel } from './FilingsPanel';
import { OutreachPanel } from './OutreachPanel';
import { NeedAlertsPanel } from './NeedAlertsPanel';
import { ReportsPanel } from './ReportsPanel';
import { MessagesPanel } from './MessagesPanel';
import { VoiceCallsPanel } from './VoiceCallsPanel';
import { NotificationsPanel } from './NotificationsPanel';
import { ReviewsPanel } from './ReviewsPanel';
import { BillingPanel } from './BillingPanel';
import { SystemPanel } from './SystemPanel';
import { AuditLogPanel } from './AuditLogPanel';
import { FilesPanel } from './FilesPanel';
import { SettingsPanel } from './SettingsPanel';
import { ReferralsPanel } from './ReferralsPanel';
import { CouponsPanel } from './CouponsPanel';
import { BlogPostsPanel } from './BlogPostsPanel';

export function SuperAdminModule({ section }: { section: AdminSectionId }) {
  const { me, isLoading, hasPermission } = useAdmin();
  const requiredPermission = ADMIN_SECTION_PERMISSIONS[section];
  const userPermissions = me?.permissions ?? [];

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-(--color-secondaryText)">
        <div className="admin-spinner size-8 animate-spin rounded-full border-2" />
        <p className="text-sm">در حال بررسی دسترسی...</p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <Lock className="size-7" />
        </div>
        <h2 className="text-xl font-bold">ورود لازم است</h2>
        <p className="mt-2 text-sm text-(--color-secondaryText)">
          برای دسترسی به پنل سوپرادمین وارد حساب کاربری شوید.
        </p>
      </div>
    );
  }

  const canViewDashboard =
    hasPermission('superadmin:overview:read') || hasPermission('superadmin:analytics:read');

  if ((section === 'overview' || section === 'analytics') && !canViewDashboard) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <Lock className="size-7" />
        </div>
        <h2 className="text-xl font-bold">دسترسی کافی ندارید</h2>
        <p className="mt-2 text-sm text-(--color-secondaryText)">
          مجوز مشاهده داشبورد لازم است.
        </p>
      </div>
    );
  }

  if (!me.isOwner && !canAccessAdminSection(section, userPermissions) && section !== 'overview' && section !== 'analytics') {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <Lock className="size-7" />
        </div>
        <h2 className="text-xl font-bold">دسترسی کافی ندارید</h2>
        <p className="mt-2 text-sm text-(--color-secondaryText)">
          مجوز `{requiredPermission}` برای این بخش لازم است.
        </p>
      </div>
    );
  }

  switch (section) {
    case 'overview':
      return <OverviewPanel />;
    case 'analytics':
      return <AnalyticsShell />;
    case 'workflow':
      return <WorkflowPanel />;
    case 'categories':
      return <CategoriesPanel />;
    case 'business-occupations':
      return <BusinessOccupationsPanel />;
    case 'online-stores':
      return <OnlineStoresPanel />;
    case 'locations':
      return <LocationsPanel />;
    case 'users':
      return <UsersPanel />;
    case 'requests':
      return <RequestsPanel />;
    case 'proposals':
      return <ProposalsPanel />;
    case 'businesses':
      return <BusinessesPanel />;
    case 'outreach':
      return <OutreachPanel />;
    case 'filings':
      return <FilingsPanel />;
    case 'need-alerts':
      return <NeedAlertsPanel />;
    case 'reports':
      return <ReportsPanel />;
    case 'messages':
      return <MessagesPanel />;
    case 'voice-calls':
      return <VoiceCallsPanel />;
    case 'notifications':
      return <NotificationsPanel />;
    case 'reviews':
      return <ReviewsPanel />;
    case 'billing':
      return <BillingPanel />;
    case 'system':
      return <SystemPanel />;
    case 'audit':
      return <AuditLogPanel />;
    case 'files':
      return <FilesPanel />;
    case 'settings':
      return <SettingsPanel />;
    case 'referrals':
      return <ReferralsPanel />;
    case 'coupons':
      return <CouponsPanel />;
    case 'blog':
      return <BlogPostsPanel />;
    default:
      return <OverviewPanel />;
  }
}

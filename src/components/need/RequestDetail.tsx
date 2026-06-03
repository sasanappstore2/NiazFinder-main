'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { ReportUser } from '@/components/shared/ReportUser';
import { NeedBriefingPanel } from '@/components/need/NeedBriefingPanel';
import { MatchedBusinessesSection } from '@/components/need/MatchedBusinessesSection';
import { OwnerProposalsSection } from '@/components/need/OwnerProposalsSection';
import { buildNeedBriefSummary } from '@/lib/need-match/brief-summary';
import type { NeedMatchContext } from '@/contracts/need-match';
import type { ServiceRequest } from '@/lib/types';
import { ContactActions } from '@/components/contact/ContactActions';
import { RequestResubmitBanner } from '@/components/need/RequestResubmitBanner';
import { NeedDetailSkeleton } from '@/components/need/NeedDetailSkeleton';
import { cn } from '@/lib/utils';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';
import { hasSuperAdminPanelAccessFromRoleAndPermissions } from '@/lib/rbac/super-admin-access';
import type { MatchedBusinessesViewerRole } from '@/components/need/MatchedBusinessesSection';

export function RequestDetail({ slug, id: idProp }: { slug?: string; id?: string } = {}) {
  const params = useParams();
  const pathParams = params?.path as string[] | undefined;
  const pathId = pathParams?.length ? pathParams[pathParams.length - 1] : undefined;

  const { goBack } = useNavigate();
  const fetchRequestDetail = useAppStore((s) => s.fetchRequestDetail);
  const currentUser = useAppStore((s) => s.currentUser);

  const requestId =
    idProp ??
    slug ??
    pathId ??
    (typeof params?.id === 'string' ? params.id : '') ??
    '';

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [apiBriefSummary, setApiBriefSummary] = useState<string | undefined>();
  const [hasStaffDebugAccess, setHasStaffDebugAccess] = useState(false);

  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      setLoadError('شناسه نامعتبر');
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchRequestDetail(requestId).then((r) => {
      if (cancelled) return;
      if (r) {
        setRequest(r);
        setLoadError(null);
      } else {
        setLoadError('نیاز یافت نشد');
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [requestId, fetchRequestDetail]);

  const isOwner = Boolean(currentUser && request && currentUser.id === request.user.id);
  const isBusinessUser = currentUser?.role === 'SPECIALIST';

  useEffect(() => {
    if (!currentUser || isOwner || isBusinessUser) {
      setHasStaffDebugAccess(false);
      return;
    }

    if (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') {
      setHasStaffDebugAccess(true);
      return;
    }

    let cancelled = false;
    void fetch('/api/super-admin/me', { headers: getClientAuthHeaders() })
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data: { isOwner?: boolean; permissions?: string[] } | null) => {
        if (cancelled || !data) return;
        const permissions = data.permissions ?? [];
        setHasStaffDebugAccess(
          hasSuperAdminPanelAccessFromRoleAndPermissions(
            currentUser.role,
            currentUser.phone,
            permissions
          )
        );
      })
      .catch(() => {
        if (!cancelled) setHasStaffDebugAccess(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, isOwner, isBusinessUser]);

  const matchedViewerRole: MatchedBusinessesViewerRole = isOwner
    ? 'owner'
    : hasStaffDebugAccess
      ? 'staff'
      : 'business';
  const showMatchedBusinesses = isOwner || isBusinessUser || hasStaffDebugAccess;

  const ruleBriefSummary = useMemo(() => {
    if (!request) return undefined;
    const ctx: NeedMatchContext = {
      id: request.id,
      title: request.title,
      description: request.description,
      city: request.city,
      province: request.province,
      categorySlug: request.categoryName,
      categoryName: request.categoryName,
      tags: request.tags,
    };
    return buildNeedBriefSummary(ctx);
  }, [request]);

  const briefSummary = apiBriefSummary ?? ruleBriefSummary;

  if (loading) {
    return <NeedDetailSkeleton />;
  }

  if (loadError || !request) {
    return (
      <div className="py-16 text-center space-y-4">
        <AlertCircle className="size-10 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">{loadError ?? 'نیاز یافت نشد'}</p>
        <Button variant="outline" onClick={goBack}>
          بازگشت
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn('min-h-screen', !isOwner && 'has-sticky-contact-bar')}
      dir="rtl"
      itemScope
      itemType="https://schema.org/Service"
    >
      <meta itemProp="name" content={request.title} />
      <meta itemProp="description" content={request.description} />

      <NeedBriefingPanel
        request={request}
        briefSummary={briefSummary}
        isOwner={isOwner}
        isBusinessUser={isBusinessUser}
        onBack={goBack}
        onReport={() => setReportOpen(true)}
      />

      {isOwner && request.moderationStatus === 'REJECTED_SOFT' && (
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <RequestResubmitBanner
            requestId={request.id}
            rejectionReason={request.rejectionReason}
            onResubmitted={() => {
              void fetchRequestDetail(requestId).then((r) => r && setRequest(r));
            }}
          />
        </div>
      )}

      {isOwner && request.moderationStatus === 'PENDING' && (
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-900 dark:text-sky-100">
            آگهی شما در صف بازبینی است و پس از تأیید در بازار نمایش داده می‌شود.
          </div>
        </div>
      )}

      {showMatchedBusinesses && (
        <MatchedBusinessesSection
          requestId={request.id}
          viewerRole={matchedViewerRole}
          onBriefSummary={(s) => setApiBriefSummary((prev) => prev ?? s)}
        />
      )}

      {isOwner && <OwnerProposalsSection requestId={request.id} />}

      {!isOwner && (
        <ContactActions
          variant="sticky"
          otherUserId={request.user.id}
          requestId={request.id}
          needPreview={{
            title: request.title,
            categoryName: request.categoryName,
            city: request.city,
          }}
          chatLabel="پیام و گفتگو"
          displayName={`${request.user.firstName} ${request.user.lastName}`.trim()}
          hasPhone
          chatEnabled
          showProfile={false}
          className="max-w-6xl mx-auto lg:hidden"
        />
      )}

      <ReportUser
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetName={request.title}
        targetType="request"
      />
    </div>
  );
}

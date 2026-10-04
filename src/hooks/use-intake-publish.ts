'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { NeedDraft, ListingPreview, IntakeStep } from '@/contracts/need-intake';
import { useAppStore } from '@/lib/store';
import { routeBuilder } from '@/config/routes';
import { trackAnalyticsEvent } from '@/lib/analytics/track';
import { publishNeedApi } from '@/lib/need-intake/intake-client';
import { getClientAuthToken } from '@/lib/auth/client-auth';
import {
  clearPendingIntakePublish,
  loadPendingIntakePublish,
  savePendingIntakePublish,
} from '@/lib/need-intake/pending-intake-publish';
import { validatePublishRequest } from '@/intake/validation/validatePublishRequest';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { resolveDeterministicListingTitle } from '@/lib/need-intake/resolve-listing-title';
import { createIntakePublishSnapshot } from '@/lib/need-intake/publish-snapshot';
import {
  trackPublishAttempt,
  trackValidationError,
} from '@/intake/telemetry/postIntakeTelemetry';
import { getSessionId } from '@/lib/analytics/collector';

export interface UseIntakePublishFormFields {
  needText: string;
  detailsText: string;
  categorySlug: string;
  subcategorySlug: string;
  city: string;
  neighborhood: string;
  neighborhoodSlug: string | null;
}

export interface UseIntakePublishOptions {
  needDraft: NeedDraft | null;
  listingPreview: ListingPreview | null;
  isLoading: boolean;
  titleEnriching: boolean;
  descEnriching: boolean;
  linkToBusinessProfile: boolean;
  getDraft: () => NeedDraft | null;
  setStep: (step: IntakeStep) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setListingPreview: (preview: ListingPreview | null) => void;
  setNeedDraft: (draft: NeedDraft) => void;
  syncNeedDraftFromFormFields: (fields: UseIntakePublishFormFields) => NeedDraft | null;
  formFields: UseIntakePublishFormFields;
  setFormFields: (fields: Partial<UseIntakePublishFormFields>) => void;
  setLinkToBusinessProfile: (value: boolean) => void;
}

export function useIntakePublish({
  needDraft,
  listingPreview,
  isLoading,
  titleEnriching,
  descEnriching,
  linkToBusinessProfile,
  getDraft,
  setStep,
  setLoading,
  setError,
  setListingPreview,
  setNeedDraft,
  syncNeedDraftFromFormFields,
  formFields,
  setFormFields,
  setLinkToBusinessProfile,
}: UseIntakePublishOptions) {
  const router = useRouter();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const setAuthModalTab = useAppStore((s) => s.setAuthModalTab);

  const [isRepublishing, setIsRepublishing] = useState(false);
  const [publishRedirect, setPublishRedirect] = useState<{ id: string; title: string } | null>(
    null
  );
  const [publishSuccessCopy, setPublishSuccessCopy] = useState<{
    message: string;
    subtitle: string;
  }>({ message: 'نیاز ثبت شد', subtitle: 'در حال انتقال به آگهی' });
  const pendingPublishResumeRef = useRef(false);
  const publishRef = useRef<() => Promise<void>>(async () => {});

  const canPublish = useMemo(() => {
    if (!listingPreview?.title.trim() || titleEnriching || descEnriching || isLoading) return false;
    if (!needDraft) return false;
    return Boolean(needDraft.publishSnapshot) &&
      validatePublishRequest(needDraft, needDraft.publishSnapshot?.listingPreview).success;
  }, [needDraft, listingPreview, titleEnriching, descEnriching, isLoading]);

  const publish = useCallback(async () => {
    const draft = getDraft() ?? needDraft;
    const snapshot = draft?.publishSnapshot;
    const effectivePreview = snapshot?.listingPreview ?? listingPreview;
    if (!draft || !effectivePreview || !snapshot) {
      toast.error('اطلاعات برای انتشار آماده نیست');
      return;
    }
    const validation = validatePublishRequest(draft, effectivePreview);
    if (!validation.success) {
      for (const err of validation.errors) {
        trackValidationError({
          field: err.field,
          message: err.message,
          source: 'publish_validator',
          step: 'preview',
        });
      }
      trackPublishAttempt({
        outcome: 'fail',
        missingRequiredFields: validation.errors.map((e) => e.field),
        errorField: validation.errors[0]?.field,
        errorMessage: validation.errors[0]?.message,
      });
      const msg = validation.errors.map((e) => e.message).join(' | ');
      toast.error(msg || 'اطلاعات لازم هنوز کامل نشده است');
      return;
    }
    if (!isAuthenticated) {
      savePendingIntakePublish({
        needText: formFields.needText,
        detailsText: formFields.detailsText,
        categorySlug: formFields.categorySlug,
        subcategorySlug: formFields.subcategorySlug,
        city: formFields.city,
        neighborhood: formFields.neighborhood,
        neighborhoodSlug: formFields.neighborhoodSlug,
        listingPreview: effectivePreview!,
        linkToBusinessProfile,
        needDraft: draft,
      });
      setAuthModalTab('login');
      setAuthModalOpen(true);
      toast.info('برای انتشار وارد حساب شوید؛ پس از ورود ادامه می‌دهیم');
      return;
    }
    setStep('publishing');
    setLoading(true);
    setError(null);
    try {
      const token = getClientAuthToken();
      const data = await publishNeedApi(draft, token, effectivePreview!, getSessionId(), {
        linkToBusinessProfile,
        idempotencyKey: snapshot.idempotencyKey,
      });
      setStep('done');
      setPublishSuccessCopy({
        message: data.autoApproved ? 'نیاز ثبت شد' : 'نیاز ارسال شد',
        subtitle:
          data.message ??
          (data.autoApproved
            ? 'در حال انتقال به آگهی'
            : 'پس از تأیید، آگهی شما منتشر می‌شود'),
      });
      setPublishRedirect({ id: data.id, title: data.title });
      clearPendingIntakePublish();
      trackPublishAttempt({
        outcome: 'success',
        autoApproved: data.autoApproved,
        requestId: data.id,
      });
      trackAnalyticsEvent('need_created', { requestId: data.id, title: data.title });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در انتشار';
      trackPublishAttempt({
        outcome: 'fail',
        errorMessage: msg,
      });
      setError(msg);
      toast.error(msg);
      setStep('preview');
    } finally {
      setLoading(false);
    }
  }, [
    formFields,
    getDraft,
    needDraft,
    listingPreview,
    isAuthenticated,
    linkToBusinessProfile,
    setAuthModalTab,
    setAuthModalOpen,
    setStep,
    setLoading,
    setError,
  ]);

  const repolishPreview = useCallback(async () => {
    const draft = getDraft();
    if (!draft || !listingPreview) return;
    setIsRepublishing(true);
    try {
      const composed = composeListingFromDraft(draft);
      const deterministicTitle = resolveDeterministicListingTitle(draft).title;
      const nextPreview = {
        ...listingPreview,
        title: deterministicTitle,
        description: composed.description,
        titleSource: 'template',
      } as ListingPreview;
      const draftForPreview = { ...draft, listingPreview: nextPreview };
      const snapshot = await createIntakePublishSnapshot(draftForPreview, nextPreview);
      setNeedDraft({ ...draftForPreview, publishSnapshot: snapshot });
      setListingPreview(nextPreview);
      toast.success('پیش‌نمایش به‌روز شد');
    } finally {
      setIsRepublishing(false);
    }
  }, [getDraft, listingPreview, setListingPreview, setNeedDraft]);

  useEffect(() => {
    publishRef.current = publish;
  });

  useEffect(() => {
    if (!publishRedirect) return;
    const timer = window.setTimeout(() => {
      router.push(routeBuilder.listing(publishRedirect.id, publishRedirect.title));
      setPublishRedirect(null);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [publishRedirect, router]);

  useEffect(() => {
    if (!isAuthenticated || pendingPublishResumeRef.current) return;
    const pending = loadPendingIntakePublish();
    if (!pending) return;
    pendingPublishResumeRef.current = true;
    setFormFields({
      needText: pending.needText,
      detailsText: pending.detailsText,
      categorySlug: pending.categorySlug,
      subcategorySlug: pending.subcategorySlug,
      city: pending.city,
      neighborhood: pending.neighborhood,
      neighborhoodSlug: pending.neighborhoodSlug,
    });
    setListingPreview(pending.listingPreview);
    setLinkToBusinessProfile(pending.linkToBusinessProfile ?? false);
    if (pending.needDraft) {
      setNeedDraft(pending.needDraft);
    }
    setStep('preview');
    clearPendingIntakePublish();
    toast.success('ورود انجام شد؛ در حال انتشار');
    window.setTimeout(() => {
      pendingPublishResumeRef.current = false;
      void publishRef.current();
    }, 300);
  }, [isAuthenticated, setListingPreview, setStep, setNeedDraft, setFormFields, setLinkToBusinessProfile]);

  return {
    publish,
    repolishPreview,
    canPublish,
    isRepublishing,
    publishRedirect,
    publishSuccessCopy,
    pendingPublishResumeRef,
  };
}

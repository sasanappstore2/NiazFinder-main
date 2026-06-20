'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Building2, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { routeBuilder } from '@/config/routes';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  businessOnboardingStep1Schema,
  businessOnboardingStep2Schema,
  businessOnboardingStep3Schema,
  type BusinessOnboardingPayload,
} from '@/lib/business/onboarding-schema';
import { ONBOARDING_DRAFT_KEY, WIZARD_STEPS } from '@/components/business-profile/onboarding/constants';
import { StepIdentity } from '@/components/business-profile/onboarding/StepIdentity';
import { StepContact } from '@/components/business-profile/onboarding/StepContact';
import { StepBrand } from '@/components/business-profile/onboarding/StepBrand';
import { StepReview } from '@/components/business-profile/onboarding/StepReview';
import { getClientAuthHeaders, getClientAuthJsonHeaders } from '@/lib/auth/client-auth';
import { trackAnalyticsEvent } from '@/lib/analytics/track';
import { normalizeIranMobile } from '@/lib/format/digits';

const EMPTY: BusinessOnboardingPayload = {
  name: '',
  occupationSlugs: [],
  primaryCategorySlug: '',
  description: '',
  phone: '',
  whatsapp: '',
  email: '',
  city: '',
  province: '',
  address: '',
  logo: '',
  coverImage: '',
  website: '',
  instagram: '',
  telegram: '',
  bale: '',
  rubika: '',
  eitaa: '',
};

type Draft = BusinessOnboardingPayload & { step?: number };

function zodFieldErrors(result: { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export function BusinessOnboardingWizard({
  initialSlug,
  onCompleted,
  skipSlugRedirect = false,
}: {
  initialSlug: string;
  onCompleted: () => void;
  /** When true (e.g. /my-business), do not navigate to /pro/{slug}/edit after publish. */
  skipSlugRedirect?: boolean;
}) {
  const router = useRouter();
  const { currentUser, authHydrated, isAuthenticated, authToken, fetchCurrentUser } =
    useAppStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<BusinessOnboardingPayload>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [slug, setSlug] = useState(initialSlug);

  const publicUrl = useMemo(() => routeBuilder.businessProfile(slug), [slug]);

  const persistDraft = useCallback((data: Draft) => {
    try {
      sessionStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, []);

  const patchForm = useCallback(
    (patch: Partial<BusinessOnboardingPayload>) => {
      setForm((prev) => {
        const next = { ...prev, ...patch };
        persistDraft({ ...next, step });
        return next;
      });
    },
    [persistDraft, step]
  );

  const refreshFormAfterSiteImport = useCallback(async () => {
    try {
      const res = await fetch('/api/business/me', { headers: getClientAuthHeaders() });
      if (!res.ok) return;
      const api = (await res.json()) as Record<string, unknown>;
      patchForm({
        name: (api.name as string) || form.name,
        description: (api.description as string) || form.description,
        phone: (api.phone as string) || form.phone,
        email: (api.email as string) || form.email,
        logo: (api.logo as string) || form.logo,
        coverImage: (api.coverImage as string) || form.coverImage,
        website: (api.website as string) || form.website,
        instagram: (api.instagram as string) || form.instagram,
        telegram: (api.telegram as string) || form.telegram,
        bale: (api.bale as string) || form.bale,
        rubika: (api.rubika as string) || form.rubika,
        eitaa: (api.eitaa as string) || form.eitaa,
      });
      toast.success('اطلاعات واردشده از سایت به فرم اضافه شد');
    } catch {
      /* ignore */
    }
  }, [form, patchForm]);

  useEffect(() => {
    if (!authHydrated) return;
    let cancelled = false;
    (async () => {
      try {
        const draftRaw = sessionStorage.getItem(ONBOARDING_DRAFT_KEY);
        let draft: Draft | null = null;
        if (draftRaw) {
          try {
            draft = JSON.parse(draftRaw) as Draft;
          } catch {
            draft = null;
          }
        }

        const api: Record<string, unknown> = {};
        if (isAuthenticated || authToken) {
          const res = await fetch('/api/business/me', { headers: getClientAuthHeaders() });
          if (res.ok) {
            Object.assign(api, await res.json());
            if (api.roleUpgraded) void fetchCurrentUser();
          }
        }

        if (!cancelled) {
          const normalizedUserPhone =
            (currentUser?.phone && normalizeIranMobile(currentUser.phone)) ?? '';

          const merged: BusinessOnboardingPayload = {
            name: (draft?.name || (api.name as string) || currentUser?.displayName || '') as string,
            occupationSlugs: (() => {
              const fromDraft = draft?.occupationSlugs;
              if (Array.isArray(fromDraft) && fromDraft.length > 0) return fromDraft;
              const fromApi = (api.occupationSlugs ?? api.categorySlugs) as string[] | undefined;
              if (Array.isArray(fromApi) && fromApi.length > 0) return fromApi;
              const single =
                (draft?.primaryCategorySlug ||
                  (api.primaryOccupationSlug as string) ||
                  (api.primaryCategorySlug as string) ||
                  '') as string;
              return single ? [single] : [];
            })(),
            primaryCategorySlug:
              (draft?.primaryCategorySlug ||
                (api.primaryOccupationSlug as string) ||
                (api.primaryCategorySlug as string) ||
                (Array.isArray(draft?.occupationSlugs) ? draft!.occupationSlugs![0] : '') ||
                '') as string,
            description: (draft?.description || (api.description as string) || '') as string,
            phone: (draft?.phone || (api.phone as string) || normalizedUserPhone || '') as string,
            whatsapp: (draft?.whatsapp || (api.whatsapp as string) || '') as string,
            email: (draft?.email || (api.email as string) || currentUser?.email || '') as string,
            city: (draft?.city || (api.city as string) || currentUser?.city || '') as string,
            province: (draft?.province || (api.province as string) || currentUser?.province || '') as string,
            address: (draft?.address || (api.address as string) || '') as string,
            logo: (draft?.logo || (api.logo as string) || '') as string,
            coverImage: (draft?.coverImage || (api.coverImage as string) || '') as string,
            website: (draft?.website || (api.website as string) || '') as string,
            instagram: (draft?.instagram || (api.instagram as string) || '') as string,
            telegram: (draft?.telegram || (api.telegram as string) || '') as string,
            bale: (draft?.bale || (api.bale as string) || '') as string,
            rubika: (draft?.rubika || (api.rubika as string) || '') as string,
            eitaa: (draft?.eitaa || (api.eitaa as string) || '') as string,
          };
          setForm(merged);
          if (typeof draft?.step === 'number' && draft.step >= 0 && draft.step <= 3) {
            setStep(draft.step);
          }
          if (typeof api.slug === 'string') setSlug(api.slug);
        }
      } catch {
        toast.error('بارگذاری اطلاعات ناموفق بود');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authHydrated, isAuthenticated, authToken, currentUser, fetchCurrentUser]);

  useEffect(() => {
    persistDraft({ ...form, step });
  }, [form, step, persistDraft]);

  const validateStep = (s: number): boolean => {
    setErrors({});
    if (s === 0) {
      const r = businessOnboardingStep1Schema.safeParse(form);
      if (!r.success) {
        setErrors(zodFieldErrors(r));
        return false;
      }
      setForm((prev) => ({
        ...prev,
        ...r.data,
        primaryCategorySlug: r.data.occupationSlugs[0] ?? '',
      }));
      return true;
    }
    if (s === 1) {
      const r = businessOnboardingStep2Schema.safeParse(form);
      if (!r.success) {
        setErrors(zodFieldErrors(r));
        return false;
      }
      setForm((prev) => ({ ...prev, ...r.data }));
      return true;
    }
    if (s === 2) {
      const r = businessOnboardingStep3Schema.safeParse(form);
      if (!r.success) {
        setErrors(zodFieldErrors(r));
        return false;
      }
      setForm((prev) => ({ ...prev, ...r.data }));
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    const next = Math.min(3, step + 1);
    trackAnalyticsEvent('onboarding_step', { step: next, slug });
    setStep(next);
  };

  const goBack = () => {
    const prev = Math.max(0, step - 1);
    trackAnalyticsEvent('onboarding_step', { step: prev, slug });
    setStep(prev);
  };

  const handlePublish = async () => {
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
      toast.error('لطفاً مراحل قبلی را تکمیل کنید');
      return;
    }

    setPublishing(true);
    try {
      const res = await fetch('/api/business/me/onboarding', {
        method: 'POST',
        headers: getClientAuthJsonHeaders(),
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string; slug?: string; message?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'انتشار ناموفق بود');
        return;
      }
      sessionStorage.removeItem(ONBOARDING_DRAFT_KEY);
      toast.success(data.message ?? 'پروفایل منتشر شد — حالا ویترین و محصولات را تکمیل کنید');
      if (!skipSlugRedirect && data.slug && data.slug !== slug) {
        router.replace(routeBuilder.businessEdit(data.slug));
      }
      router.refresh();
      onCompleted();
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setPublishing(false);
    }
  };

  if (!authHydrated || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        آماده‌سازی ویزارد ثبت کسب‌وکار...
      </div>
    );
  }

  const progressPct = (step / (WIZARD_STEPS.length - 1)) * 100;

  return (
    <div className="mx-auto w-full max-w-[610px] space-y-[34px] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-linear-to-br from-emerald-500/10 via-background to-background p-[21px] sm:p-[34px]">
        <div className="flex items-start gap-3">
          <Building2 className="size-6 shrink-0 text-emerald-600" />
          <div className="space-y-1">
            <h1 className="text-xl font-bold">ثبت کسب‌وکار</h1>
            <p className="text-sm text-muted-foreground">
              چند مرحله ساده تا پروفایل شما برای مشتریان قابل مشاهده شود.
            </p>
          </div>
        </div>
      </div>

      <nav aria-label="پیشرفت ثبت" className="relative px-2">
        <div className="absolute top-[17px] right-[34px] left-[34px] h-0.5 bg-border/80" />
        <div
          className="absolute top-[17px] right-[34px] h-0.5 bg-emerald-500 transition-all duration-300"
          style={{ width: `calc((100% - 68px) * ${progressPct / 100})` }}
        />
        <ol className="relative flex justify-between">
          {WIZARD_STEPS.map((s) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <li key={s.id} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'flex size-[34px] items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors',
                    done || active
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-border bg-background text-muted-foreground'
                  )}
                >
                  {done ? <Check className="size-4" /> : s.id + 1}
                </div>
                <span
                  className={cn(
                    'hidden text-xs sm:block',
                    active ? 'font-medium text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'
                  )}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <Card>
        <CardHeader className="pb-[13px]">
          <CardTitle className="text-base">{WIZARD_STEPS[step]?.label}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {step === 0 && (
            <StepIdentity
              values={form}
              errors={errors}
              personName={currentUser?.displayName}
              onChange={patchForm}
            />
          )}
          {step === 1 && (
            <StepContact
              values={form}
              errors={errors}
              onChange={patchForm}
            />
          )}
          {step === 2 && (
            <StepBrand
              values={form}
              errors={errors}
              onChange={patchForm}
              occupationSlugs={form.occupationSlugs}
              onSiteImportApplied={() => void refreshFormAfterSiteImport()}
            />
          )}
          {step === 3 && (
            <StepReview
              values={form}
              publicUrl={publicUrl}
              publishing={publishing}
              onPublish={() => void handlePublish()}
            />
          )}
        </CardContent>
      </Card>

      {step < 3 && (
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              disabled={step === 0}
              onClick={goBack}
            >
              <ArrowRight className="ms-1 size-4" />
              قبلی
            </Button>
            <Button type="button" className="flex-1 sm:flex-none" onClick={goNext}>
              بعدی
              <ArrowLeft className="me-1 size-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <Button type="button" variant="outline" className="w-full" onClick={goBack}>
            <ArrowRight className="ms-1 size-4" />
            بازگشت به مرحله قبل
          </Button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn, Store } from 'lucide-react';
import { routeBuilder } from '@/config/routes';
import { useAppStore } from '@/lib/store';
import { getClientAuthHeaders, getClientAuthToken } from '@/lib/auth/client-auth';
import { Button } from '@/components/ui/button';
import { BusinessOnboardingWizard } from '@/components/business-profile/BusinessOnboardingWizard';
import { BusinessHubProvider } from '@/components/business-profile/hub/BusinessHubContext';
import { BusinessHubLayout } from '@/components/business-profile/hub/BusinessHubLayout';

type LoadState = 'loading' | 'ready' | 'unauthorized' | 'forbidden' | 'error';

export function MyBusinessEditPage({
  slugFromUrl,
  fixedRoute = false,
}: {
  slugFromUrl?: string;
  fixedRoute?: boolean;
}) {
  const router = useRouter();
  const {
    isAuthenticated,
    authHydrated,
    authToken,
    fetchCurrentUser,
    setAuthModalOpen,
  } = useAppStore();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profileMeta, setProfileMeta] = useState<{
    slug: string;
    name: string;
    onboardingCompleted: boolean;
  } | null>(null);

  const hasToken = Boolean(authToken || getClientAuthToken());

  const loadProfile = useCallback(async () => {
    if (!authHydrated) return;

    if (!isAuthenticated && !hasToken) {
      setLoadState('unauthorized');
      return;
    }

    setLoadState('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/business/me', { headers: getClientAuthHeaders() });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        slug?: string;
        name?: string;
        onboardingCompleted?: boolean;
        roleUpgraded?: boolean;
      };

      if (res.status === 401) {
        setLoadState('unauthorized');
        return;
      }
      if (res.status === 403) {
        setLoadState('forbidden');
        setErrorMessage(data.error ?? '');
        return;
      }
      if (!res.ok || !data.slug || !data.name) {
        setLoadState('error');
        setErrorMessage(data.error ?? 'بارگذاری پروفایل ناموفق بود');
        return;
      }

      if (data.roleUpgraded) {
        void fetchCurrentUser();
      }

      setShowOnboarding(!data.onboardingCompleted);

      if (!fixedRoute && slugFromUrl && data.slug !== slugFromUrl) {
        router.replace(routeBuilder.businessEdit(data.slug));
        return;
      }

      setProfileMeta({
        slug: data.slug,
        name: data.name,
        onboardingCompleted: Boolean(data.onboardingCompleted),
      });
      setLoadState('ready');
    } catch {
      setLoadState('error');
      setErrorMessage('خطا در ارتباط با سرور');
    }
  }, [authHydrated, isAuthenticated, hasToken, fixedRoute, router, slugFromUrl, fetchCurrentUser]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleProfileSaved = useCallback(
    (data: { slug: string; name: string }) => {
      setProfileMeta((prev) =>
        prev ? { ...prev, slug: data.slug, name: data.name } : null
      );
      if (!fixedRoute && slugFromUrl && data.slug !== slugFromUrl) {
        router.replace(routeBuilder.businessEdit(data.slug));
      }
    },
    [fixedRoute, router, slugFromUrl]
  );

  const handleOnboardingCompleted = useCallback(() => {
    setShowOnboarding(false);
    void loadProfile();
  }, [loadProfile]);

  if (!authHydrated || loadState === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        در حال بارگذاری...
      </div>
    );
  }

  if (loadState === 'unauthorized') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <LogIn className="size-10 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">ورود لازم است</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          برای ثبت یا مدیریت کسب‌وکار، با همان شماره‌ای که وارد شده‌اید وارد شوید.
        </p>
        <Button type="button" onClick={() => setAuthModalOpen(true)}>
          ورود با شماره موبایل
        </Button>
      </div>
    );
  }

  if (loadState === 'forbidden') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <Store className="size-10 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">دسترسی محدود است</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {errorMessage || 'این حساب اجازهٔ مدیریت پروفایل کسب‌وکار را ندارد.'}
        </p>
        <Button variant="outline" asChild>
          <Link href={routeBuilder.dashboard()}>بازگشت به داشبورد</Link>
        </Button>
      </div>
    );
  }

  if (loadState === 'error' || !profileMeta) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <Store className="size-10 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">خطا در بارگذاری</h2>
        <p className="max-w-md text-sm text-muted-foreground">{errorMessage}</p>
        <Button type="button" variant="outline" onClick={() => void loadProfile()}>
          تلاش مجدد
        </Button>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <BusinessOnboardingWizard
        initialSlug={profileMeta.slug}
        onCompleted={handleOnboardingCompleted}
        skipSlugRedirect={fixedRoute}
      />
    );
  }

  return (
    <BusinessHubProvider initialTask="storefront">
      <BusinessHubLayout onProfileSaved={handleProfileSaved} />
    </BusinessHubProvider>
  );
}

'use client';

import { Suspense, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Building2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CitySelectorPopup } from '@/components/ui/city-selector-popup';
import { NeedLeadPromptBox, LeadQuickChips } from '@/components/home/ai-lead';
import { COMPOSER_MAX_WIDTH } from '@/components/home/ai-lead/ai-lead-tokens';
import type { LeadChipId } from '@/components/home/ai-lead';
import { useLocationSelection } from '@/hooks/use-location-selection';
import { useManagedLocations } from '@/lib/use-managed-locations';
import type { City } from '@/lib/location-system';
import { routeBuilder } from '@/config/routes';
import { getBrowseUrl } from '@/lib/search/browse-entry-url';
import { locationCityIdToSlug } from '@/lib/search/city-slugs';
import { getLeadPhone } from '@/lib/lead-draft';
import { buildHomeToPostSearchParams } from '@/lib/need-intake/home-post-seamless';
import { trackAnalyticsEvent } from '@/lib/analytics/track';
import { useAppStore } from '@/lib/store';
import { useHomeLeadAnalyzePrefetch } from '@/hooks/use-home-lead-analyze-prefetch';
import { toast } from 'sonner';

/** Normalize Persian for matching (unify ي/ی, ك/ک, drop ZWNJ, collapse spaces). */
function normFa(s: string): string {
  return s
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/‌/g, ' ')
    .replace(/[،.,؛:()«»"'\/\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Guess up to `max` cities explicitly mentioned in the need text (1–2 word names). */
function guessCitiesFromText(text: string, cities: City[], max = 3): City[] {
  if (!text.trim() || !cities.length) return [];
  const byName = new Map<string, City>();
  for (const c of cities) {
    const key = normFa(c.name);
    if (key.length >= 3 && !byName.has(key)) byName.set(key, c);
  }
  const words = normFa(text).split(' ').filter(Boolean);
  const out: City[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < words.length && out.length < max; i++) {
    for (let n = 2; n >= 1; n--) {
      if (i + n > words.length) continue;
      const gram = words.slice(i, i + n).join(' ');
      if (gram.length < 3) continue;
      const c = byName.get(gram);
      if (c && !seen.has(c.id)) {
        seen.add(c.id);
        out.push(c);
        i += n - 1;
        break;
      }
    }
  }
  return out;
}

export function HomeLeadLandingFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" aria-busy="true">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  );
}

function HomeLeadLandingContent() {
  const router = useRouter();
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);

  const {
    isOpen: cityPickerOpen,
    setIsOpen: setCityPickerOpen,
    selectedCities,
    selectedProvinceIds,
    isInitialized,
    getLocationDisplayText,
    handleSelectionChange,
    geo,
  } = useLocationSelection({ preservePathOnHome: true });

  const [needText, setNeedText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { cities } = useManagedLocations();
  const suggestedCities = useMemo(
    () => guessCitiesFromText(needText, cities, 3),
    [needText, cities]
  );

  const hasCity = selectedCities.length > 0 || selectedProvinceIds.length > 0;
  const primaryCity = selectedCities[0];
  const citySlug = primaryCity ? locationCityIdToSlug(primaryCity.id) : null;
  const cityName = primaryCity?.name ?? null;

  const { status: prefetchStatus, flushPrefetch } = useHomeLeadAnalyzePrefetch({
    text: needText,
    citySlug,
    cityName,
    // Match /post cache key (city is required before submit).
    enabled: hasCity && needText.trim().length >= 8,
  });

  const focusComposer = useCallback(() => {
    requestAnimationFrame(() => composerInputRef.current?.focus());
  }, []);

  const navigateToPostForm = useCallback(
    (seed: string) => {
      const storedPhone = getLeadPhone();
      const params = buildHomeToPostSearchParams({
        seed,
        citySlug,
        phone: storedPhone || undefined,
      });
      trackAnalyticsEvent('intake_home_lead_submit', {
        hasCity: Boolean(citySlug),
        hasCategory: params.has('category'),
        hasPhone: params.has('phone'),
        seedLength: seed.length,
        prefetchStatus,
      });
      setIsSubmitting(true);
      router.push(`${routeBuilder.needNew()}?${params.toString()}`);
    },
    [router, citySlug, prefetchStatus]
  );

  const goToPost = useCallback(async () => {
    const seed = needText.trim();
    if (!seed) {
      toast.error('لطفاً نیاز خود را بنویسید');
      focusComposer();
      return;
    }
    if (!hasCity) {
      toast.error('ابتدا شهر خود را انتخاب کنید');
      setCityPickerOpen(true);
      return;
    }
    setIsSubmitting(true);
    try {
      // Finish in-flight background analyze so /post can hit a warm cache.
      await flushPrefetch(2800);
    } catch {
      /* navigate anyway */
    }
    navigateToPostForm(seed);
  }, [
    needText,
    hasCity,
    setCityPickerOpen,
    focusComposer,
    navigateToPostForm,
    flushPrefetch,
  ]);

  const browseNeeds = useCallback(() => {
    if (!hasCity) {
      toast.error('ابتدا شهر خود را انتخاب کنید');
      setCityPickerOpen(true);
      return;
    }
    router.push(getBrowseUrl({ type: 'need', citySlug: citySlug ?? undefined }));
  }, [hasCity, citySlug, router, setCityPickerOpen]);

  const registerBusiness = useCallback(() => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    router.push(routeBuilder.dashboard());
  }, [isAuthenticated, router, setAuthModalOpen]);

  const handleChipAction = useCallback(
    (id: LeadChipId) => {
      switch (id) {
        case 'pick-city':
          setCityPickerOpen(true);
          break;
        case 'geo':
          void geo.runDetection();
          break;
        case 'browse-needs':
          browseNeeds();
          break;
        case 'register-business':
          registerBusiness();
          break;
        default:
          break;
      }
    },
    [geo, browseNeeds, registerBusiness, setCityPickerOpen]
  );

  if (!isInitialized) {
    return <HomeLeadLandingFallback />;
  }

  return (
    <div className="flex flex-col" dir="rtl">
      {/* AI hero — full viewport feel */}
      <section
        className="relative flex min-h-0 flex-col overflow-hidden sm:min-h-viewport-content lg:min-h-[calc(100dvh-var(--site-header-offset,6.5rem))]"
        aria-label="شروع گفتگو با دستیار هوشمند"
      >
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(var(--primary)/0.18),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_100%,oklch(var(--primary)/0.08),transparent_50%)]" />
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(oklch(var(--foreground)/0.15) 1px, transparent 1px), linear-gradient(90deg, oklch(var(--foreground)/0.15) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        <div className="container-default mx-auto flex flex-1 flex-col items-center justify-center px-3 py-6 sm:px-5 sm:py-10 md:px-8 md:py-14">
          <motion.div
            className="mb-5 w-full text-center sm:mb-[34px]"
            style={{ maxWidth: COMPOSER_MAX_WIDTH }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' as const }}
          >
            <div className="mb-[13px] inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-[13px] py-[8px] text-sm font-medium text-primary">
              <Sparkles className="size-4" aria-hidden />
              دستیار هوشمند نیاز فایندر
            </div>
            <h1 className="text-display text-balance-safe">
              نیازتان را بگویید
            </h1>
            <p className="mx-auto mt-2.5 max-w-lg px-1 text-[13px] leading-relaxed text-muted-foreground sm:mt-3 sm:px-0 sm:text-sm md:text-base">
              ثبت نیاز رایگان در نیاز فایندر — خدمات، تعمیرات، املاک و هر حوزه‌ای دیگر.
              کافی است بنویسید؛ فرم با هوش مصنوعی پر می‌شود و کسب‌وکارهای شهر شما پیشنهاد
              می‌دهند.
            </p>
          </motion.div>

          <motion.div
            className="w-full"
            style={{ maxWidth: COMPOSER_MAX_WIDTH }}
            initial={{ opacity: 0, y: 21 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.089, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="relative rounded-2xl p-2 sm:rounded-[34px] sm:p-[21px]"
              style={{
                background:
                  'linear-gradient(145deg, oklch(var(--primary) / 0.06) 0%, transparent 61.8%)',
              }}
            >
              <div
                className="pointer-events-none absolute -inset-px rounded-2xl opacity-50 sm:rounded-[34px]"
                style={{
                  background:
                    'linear-gradient(135deg, oklch(var(--primary) / 0.12), transparent 50%, oklch(var(--primary) / 0.05))',
                }}
                aria-hidden
              />
              <div className="relative">
            <NeedLeadPromptBox
              inputRef={composerInputRef}
              value={needText}
              onChange={setNeedText}
              onSubmit={() => void goToPost()}
              phone=""
              onPhoneChange={() => {}}
              showPhoneField={false}
              cityLabel={getLocationDisplayText()}
              hasCity={hasCity}
              isGeoDetecting={geo.isDetecting}
              onOpenCityPicker={() => setCityPickerOpen(true)}
              onDetectLocation={() => void geo.runDetection()}
              isSubmitting={isSubmitting}
              prefetchStatus={prefetchStatus}
            />

            <LeadQuickChips
              hasCity={hasCity}
              cityName={primaryCity?.name}
              isGeoDetecting={geo.isDetecting}
              onChipAction={handleChipAction}
            />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Business CTA — below fold */}
      <section className="border-t border-border/60 bg-muted/20">
        <div className="container-default mx-auto max-w-lg px-5 py-10 md:px-8">
          <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur-xs">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="size-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold">کسب‌وکار دارید؟</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  پروفایل کسب‌وکار خود را در داشبورد تکمیل کنید تا مشتریان همان
                  شهر شما را پیدا کنند.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={registerBusiness}
            >
              ثبت / تکمیل پروفایل کسب‌وکار
            </Button>
          </div>
        </div>
      </section>

      <CitySelectorPopup
        open={cityPickerOpen}
        onOpenChange={setCityPickerOpen}
        selectedCities={selectedCities}
        selectedProvinceIds={selectedProvinceIds}
        onSelectionChange={handleSelectionChange}
        geoStatus={geo.status}
        detectedCity={geo.detectedCity}
        isDetecting={geo.isDetecting}
        onDetectLocation={() => void geo.runDetection()}
        suggestedCities={suggestedCities}
      />
    </div>
  );
}

/** Home AI lead hero — Suspense required for useSearchParams in location hook. */
export function HomeLeadLanding() {
  return (
    <Suspense fallback={<HomeLeadLandingFallback />}>
      <HomeLeadLandingContent />
    </Suspense>
  );
}

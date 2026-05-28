'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Building2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CitySelectorPopup } from '@/components/ui/city-selector-popup';
import { NeedLeadPromptBox, LeadQuickChips } from '@/components/home/ai-lead';
import { COMPOSER_MAX_WIDTH } from '@/components/home/ai-lead/ai-lead-tokens';
import type { LeadChipId } from '@/components/home/ai-lead';
import { useLocationSelection } from '@/hooks/use-location-selection';
import { routeBuilder } from '@/config/routes';
import { getBrowseUrl } from '@/lib/search/browse-entry-url';
import {
  getLeadPhone,
  isValidIranMobile,
  normalizeIranMobile,
  setLeadPhone,
} from '@/lib/lead-draft';
import { locationCityIdToSlug } from '@/lib/search/city-slugs';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { parseIntentApi } from '@/lib/need-intake/intake-client';
import type { ParseIntentResponse } from '@/contracts/need-intake';

const SHOW_INTAKE_HOME_PREVIEW =
  process.env.NEXT_PUBLIC_INTAKE_HOME_PREVIEW === '1' ||
  process.env.NEXT_PUBLIC_INTAKE_HOME_PREVIEW === 'true';

export function HomeLeadLanding() {
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
  const [phone, setPhone] = useState(() =>
    typeof window !== 'undefined' ? getLeadPhone() : ''
  );
  const [homeParsePreview, setHomeParsePreview] = useState<ParseIntentResponse | null>(null);
  const [homeParseLoading, setHomeParseLoading] = useState(false);
  const [homeParseError, setHomeParseError] = useState<string | null>(null);

  const hasCity = selectedCities.length > 0 || selectedProvinceIds.length > 0;
  const primaryCity = selectedCities[0];
  const citySlug = primaryCity ? locationCityIdToSlug(primaryCity.id) : null;

  const focusComposer = useCallback(() => {
    requestAnimationFrame(() => composerInputRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!SHOW_INTAKE_HOME_PREVIEW) return;
    setHomeParsePreview(null);
    setHomeParseError(null);
  }, [needText]);

  const navigateToPostForm = useCallback(
    (seed: string, normalizedPhone: string) => {
      const params = new URLSearchParams();
      params.set('seed', seed);
      if (citySlug) params.set('city', citySlug);
      if (normalizedPhone) params.set('phone', normalizedPhone);
      router.push(`${routeBuilder.needNew()}?${params.toString()}`);
    },
    [router, citySlug]
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
    const normalized = normalizeIranMobile(phone);
    if (phone.trim() && !isValidIranMobile(normalized)) {
      toast.error('شماره موبایل معتبر نیست (مثال: 09123456789)');
      return;
    }
    if (normalized) setLeadPhone(normalized);

    if (SHOW_INTAKE_HOME_PREVIEW) {
      setHomeParseError(null);
      setHomeParseLoading(true);
      try {
        const data = await parseIntentApi(seed);
        setHomeParsePreview(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'خطا در تحلیل';
        setHomeParseError(msg);
        setHomeParsePreview(null);
        toast.error(msg);
      } finally {
        setHomeParseLoading(false);
      }
      return;
    }

    navigateToPostForm(seed, normalized);
  }, [
    needText,
    hasCity,
    phone,
    setCityPickerOpen,
    focusComposer,
    navigateToPostForm,
  ]);

  const continueToPostFromPreview = useCallback(() => {
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
    const normalized = normalizeIranMobile(phone);
    if (phone.trim() && !isValidIranMobile(normalized)) {
      toast.error('شماره موبایل معتبر نیست (مثال: 09123456789)');
      return;
    }
    if (normalized) setLeadPhone(normalized);
    navigateToPostForm(seed, normalized);
  }, [
    needText,
    hasCity,
    phone,
    setCityPickerOpen,
    focusComposer,
    navigateToPostForm,
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
          void geo.runDetection(true);
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
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col" dir="rtl">
      {/* AI hero — full viewport feel */}
      <section
        className="relative flex min-h-[calc(100dvh-8rem)] flex-col overflow-hidden sm:min-h-[calc(100dvh-var(--mobile-nav-bar,3.25rem)-5rem)]"
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

        <div className="container-default mx-auto flex flex-1 flex-col items-center justify-center px-5 py-10 md:px-8 md:py-14">
          <motion.div
            className="mb-[34px] w-full text-center"
            style={{ maxWidth: COMPOSER_MAX_WIDTH }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' as const }}
          >
            <div className="mb-[13px] inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-[13px] py-[8px] text-sm font-medium text-primary">
              <Sparkles className="size-4" aria-hidden />
              دستیار هوشمند نیاز فایندر
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              نیازتان را بگویید
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              مثل گفتگو با یک دستیار — نیاز را بنویسید، کسب‌وکارهای همان شهر
              پیشنهاد می‌دهند و از داخل سایت با شما گفتگو می‌کنند.
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
              className="relative rounded-[34px] p-[13px] sm:p-[21px]"
              style={{
                background:
                  'linear-gradient(145deg, oklch(var(--primary) / 0.06) 0%, transparent 61.8%)',
              }}
            >
              <div
                className="pointer-events-none absolute -inset-px rounded-[34px] opacity-50"
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
              phone={phone}
              onPhoneChange={setPhone}
              cityLabel={getLocationDisplayText()}
              hasCity={hasCity}
              isGeoDetecting={geo.isDetecting}
              onOpenCityPicker={() => setCityPickerOpen(true)}
              onDetectLocation={() => void geo.runDetection(true)}
              isSubmitting={SHOW_INTAKE_HOME_PREVIEW && homeParseLoading}
            />

            {SHOW_INTAKE_HOME_PREVIEW &&
              (homeParsePreview || homeParseError) &&
              !homeParseLoading && (
                <div
                  className="mt-4 rounded-2xl border border-border/60 bg-muted/40 p-4 text-start text-sm"
                  aria-live="polite"
                  dir="rtl"
                >
                  <p className="mb-1 font-semibold">پیش‌نمایش پارس نیاز‌فایندر</p>
                  {homeParseError ? (
                    <p className="text-destructive">{homeParseError}</p>
                  ) : (
                    homeParsePreview && (
                      <>
                        <p className="mt-2 text-muted-foreground">
                          {homeParsePreview.assistantMessage}
                        </p>
                        <p className="mt-2 font-mono text-xs text-muted-foreground">
                          دسته:&nbsp;{homeParsePreview.parsed.categorySlug}
                          {homeParsePreview.meta?.engine != null && (
                            <> · engine:&nbsp;{homeParsePreview.meta.engine}</>
                          )}
                          {homeParsePreview.meta?.source != null && (
                            <> · source:&nbsp;{homeParsePreview.meta.source}</>
                          )}
                        </p>
                        <details className="mt-3">
                          <summary className="cursor-pointer select-none text-xs font-medium">
                            پارس خام (parsed)
                          </summary>
                          <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-background p-2 text-xs leading-relaxed">
                            {JSON.stringify(homeParsePreview.parsed, null, 2)}
                          </pre>
                        </details>
                        <Button
                          type="button"
                          className="mt-4 w-full sm:w-auto"
                          onClick={continueToPostFromPreview}
                        >
                          ادامه به فرم ثبت نیاز
                        </Button>
                      </>
                    )
                  )}
                </div>
              )}

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
        onDetectLocation={() => void geo.runDetection(true)}
      />
    </div>
  );
}

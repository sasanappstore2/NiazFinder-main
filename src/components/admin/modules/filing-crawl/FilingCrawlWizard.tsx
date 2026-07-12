'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  Loader2,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { type CrawlBlueprint } from '@/lib/filing-scrapers/crawl-blueprint';
import type { NormalizedScrapedRow } from '@/lib/filing-scrapers/normalize-listing';
import { compileBlueprintFromDiscovery } from '@/lib/filing-scrapers/portal-families/blueprint-compiler';
import { buildScanRegions, type ScanRegion } from '@/lib/filing-scrapers/portal-families/scan-regions';
import type { DiscoveryResult, FieldGuess, SiteIndex } from '@/lib/filing-scrapers/portal-families/types';
import { AiOnboardProgress, stepsFromJobPayload } from './AiOnboardProgress';
import { discoveryGateOk, FieldConfidenceGrid } from './FieldConfidenceGrid';
import { PortalScanMap } from './PortalScanMap';
import {
  applyPortalToWizardDefaults,
  IRAN_FILING_PORTALS,
  portalStatusLabel,
} from '@/lib/filing-scrapers/portal-registry/iran-portals';
import { SiteMapPanel } from './SiteMapPanel';
import type { PortalSiteMap } from '@/lib/filing-scrapers/portal-families/types';
import { formatOnboardTelemetry, parseOnboardTelemetry } from '@/lib/filing-scrapers/portal-registry/onboard-telemetry';
import { formatApiError } from '@/lib/api/format-api-error';
import {
  deriveDisplayNameFromLoginUrl,
  resolveFilingSiteKey,
} from '@/lib/filing-scrapers/derive-site-key';

const STEPS = [
  'تنظیمات ربات',
  'نقشه‌سازی پورتال',
  'تست استخراج',
  'ذخیره و زمان‌بندی',
] as const;

type WizardState = {
  name: string;
  siteKey: string;
  loginUrl: string;
  listingsUrl: string;
  username: string;
  password: string;
  defaultCity: string;
  defaultNeighborhood: string;
  intervalMinutes: string;
  jitterMinutes: string;
  blueprint: CrawlBlueprint;
};

function defaultState(): WizardState {
  return {
    name: '',
    siteKey: '',
    loginUrl: '',
    listingsUrl: '',
    username: '',
    password: '',
    defaultCity: 'مشهد',
    defaultNeighborhood: '',
    intervalMinutes: '10',
    jitterMinutes: '4',
    blueprint: { version: 2 },
  };
}

type ScraperListResponse = {
  scrapers: Array<{
    id: string;
    name: string;
    siteKey: string;
    loginUrl: string;
    listingsUrl: string;
    username: string;
    defaultCity: string;
    defaultNeighborhood: string | null;
    intervalMinutes: number;
    jitterMinutes: number;
    siteConfig: CrawlBlueprint;
  }>;
};

type AiOnboardResult = {
  ok?: boolean;
  loginUrl?: string;
  listingsUrl?: string;
  blueprint?: CrawlBlueprint;
  siteIndex?: SiteIndex;
  fieldGuesses?: FieldGuess[];
  sampleCards?: string[];
  previewListings?: Array<Record<string, unknown>>;
  storageStatePath?: string;
  telemetry?: Array<Record<string, unknown>>;
  mode?: 'public_map' | 'authenticated';
  navigationTree?: PortalSiteMap['navigationTree'];
  listPages?: PortalSiteMap['listPages'];
  fieldVisibility?: PortalSiteMap['fieldVisibility'];
  pagesVisited?: number;
  loginRequired?: boolean;
  notes?: string;
};

export function FilingCrawlWizard({
  scraperId,
  onClose,
}: {
  scraperId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { apiFetch } = useAdmin();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(defaultState);
  const [fieldGuesses, setFieldGuesses] = useState<FieldGuess[]>([]);
  const [siteIndex, setSiteIndex] = useState<SiteIndex | null>(null);
  const [scanRegions, setScanRegions] = useState<ScanRegion[]>([]);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
  const [autoOnboardLoading, setAutoOnboardLoading] = useState(false);
  const [onboardReport, setOnboardReport] = useState<string | null>(null);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardProgress, setOnboardProgress] = useState(0);
  const [onboardSteps, setOnboardSteps] = useState(stepsFromJobPayload({}).steps);
  const [selectedPortalKey, setSelectedPortalKey] = useState('custom');
  const [previewRows, setPreviewRows] = useState<NormalizedScrapedRow[]>([]);
  const [previewMeta, setPreviewMeta] = useState<{ pageUrl?: string; extractMethod?: string }>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [evalReport, setEvalReport] = useState<{
    count: number;
    fileCodeRate: number;
    titleRate: number;
    priceRate: number;
    dealTypeRate: number;
    attributeRate: number;
    dealCoverage: string;
    extractMethod?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingScraper, setLoadingScraper] = useState(Boolean(scraperId));
  const [portalSiteMap, setPortalSiteMap] = useState<PortalSiteMap | null>(null);
  const [activeFixField, setActiveFixField] = useState<string | null>(null);
  const [manualSelector, setManualSelector] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resolvedSiteKey = useMemo(
    () =>
      resolveFilingSiteKey({
        loginUrl: state.loginUrl,
        catalogSiteKey: selectedPortalKey,
        explicitSiteKey: scraperId ? state.siteKey : null,
      }),
    [scraperId, selectedPortalKey, state.loginUrl, state.siteKey]
  );

  useEffect(() => {
    if (scraperId) return;
    const hostLabel = deriveDisplayNameFromLoginUrl(state.loginUrl);
    if (!hostLabel) return;
    setState((prev) => {
      const next = { ...prev };
      if (!prev.name.trim()) next.name = hostLabel;
      return next;
    });
  }, [scraperId, state.loginUrl]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [mounted, onClose]);

  useEffect(() => {
    if (!scraperId) return;
    void (async () => {
      try {
        const res = await apiFetch<ScraperListResponse>('/api/super-admin/filing-scrapers');
        const row = res.scrapers.find((s) => s.id === scraperId);
        if (!row) {
          toast.error('ربات یافت نشد');
          return;
        }
        setState({
          name: row.name,
          siteKey: row.siteKey,
          loginUrl: row.loginUrl,
          listingsUrl: row.listingsUrl,
          username: row.username,
          password: '',
          defaultCity: row.defaultCity,
          defaultNeighborhood: row.defaultNeighborhood ?? '',
          intervalMinutes: String(row.intervalMinutes),
          jitterMinutes: String(row.jitterMinutes),
          blueprint: { version: 2, ...row.siteConfig },
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'خطا در بارگذاری');
      } finally {
        setLoadingScraper(false);
      }
    })();
  }, [apiFetch, scraperId]);

  const applyDiscovery = useCallback((raw: AiOnboardResult) => {
    if (!raw.siteIndex && !raw.blueprint) return;
    if (raw.siteIndex) {
      const compiled = compileBlueprintFromDiscovery(
        {
          ok: true,
          siteIndex: raw.siteIndex,
          fieldGuesses: raw.fieldGuesses,
          sampleCards: raw.sampleCards,
          blueprint: raw.blueprint,
        },
        state.defaultCity
      );
      setFieldGuesses(compiled.fieldGuesses);
      setSiteIndex(compiled.siteIndex);
      const bp = { ...compiled.blueprint };
      if (raw.storageStatePath) {
        bp.auth = { ...bp.auth, storageStatePath: raw.storageStatePath };
      }
      setState((prev) => ({
        ...prev,
        loginUrl: raw.loginUrl ?? prev.loginUrl,
        listingsUrl: raw.listingsUrl ?? prev.listingsUrl,
        blueprint: {
          ...bp,
          portalMap: raw.blueprint?.portalMap ?? bp.portalMap,
        },
      }));
      setScanRegions(buildScanRegions({ siteIndex: compiled.siteIndex, fieldGuesses: compiled.fieldGuesses, blueprint: bp }));
      return;
    }
    if (raw.blueprint) {
      setState((prev) => ({
        ...prev,
        loginUrl: raw.loginUrl ?? prev.loginUrl,
        listingsUrl: raw.listingsUrl ?? prev.listingsUrl,
        blueprint: { version: 2, ...raw.blueprint },
      }));
    }
  }, [state.defaultCity]);

  const applyOnboardResult = useCallback(
    (result: AiOnboardResult) => {
      if (result.siteIndex || result.blueprint) {
        applyDiscovery(result);
      }
      setState((prev) => ({
        ...prev,
        loginUrl: result.loginUrl ?? prev.loginUrl,
        listingsUrl: result.listingsUrl ?? prev.listingsUrl,
      }));
      if (result.listPages?.length || result.navigationTree?.length || result.loginUrl) {
        setPortalSiteMap({
          entryUrl: result.loginUrl ?? state.loginUrl,
          pagesVisited: result.pagesVisited ?? 0,
          loginRequired: result.loginRequired,
          loginUrl: result.loginUrl ?? null,
          listingsUrl: result.listingsUrl,
          listPages: result.listPages ?? [],
          navigationTree: result.navigationTree,
          fieldVisibility: result.fieldVisibility,
          notes: result.notes,
          mode: result.mode,
        });
      }
      const telemetry = parseOnboardTelemetry({
        ok: true,
        listingsUrl: result.listingsUrl,
        blueprint: result.blueprint,
        siteIndex: result.siteIndex,
        report: {
          steps: (result.telemetry ?? []).map((t) => String(t.event ?? '')),
        },
      });
      setOnboardReport(formatOnboardTelemetry(telemetry));

      if (result.previewListings?.length) {
        setPreviewRows(
          result.previewListings.map((row) => ({
            title: String(row.title ?? ''),
            fileCode: row.fileCode != null ? String(row.fileCode) : null,
            neighborhood: row.neighborhood != null ? String(row.neighborhood) : null,
            status: 'active' as const,
            externalId: String(row.externalId ?? row.fileCode ?? ''),
            dealType: row.dealType != null ? String(row.dealType) : null,
            propertyKind: row.propertyKind != null ? String(row.propertyKind) : null,
            city: row.city != null ? String(row.city) : state.defaultCity,
            cityId: null,
            neighborhoodId: null,
            categorySlug: null,
            reviewIssues: [],
            postedAt: null,
            location: row.location != null ? String(row.location) : null,
            price: row.price != null ? String(row.price) : null,
            deposit: row.deposit != null ? String(row.deposit) : null,
            monthlyRent: row.monthlyRent != null ? String(row.monthlyRent) : null,
            area: row.area != null ? String(row.area) : null,
            rooms: typeof row.rooms === 'number' ? row.rooms : null,
            floor: typeof row.floor === 'number' ? row.floor : null,
            pricePerMeter: row.pricePerMeter != null ? String(row.pricePerMeter) : null,
            description: row.description != null ? String(row.description) : null,
          }))
        );
      }
    },
    [applyDiscovery, state.defaultCity, state.loginUrl]
  );

  const applyManualFieldFix = useCallback(
    (field: keyof NonNullable<CrawlBlueprint['fieldMap']>) => {
      const sel = manualSelector.trim();
      if (!sel) {
        toast.error('selector یا regex وارد کنید');
        return;
      }
      setState((prev) => {
        const fieldMap = { ...(prev.blueprint.fieldMap ?? {}) };
        fieldMap[field] = {
          scope: 'item',
          attr: 'textContent',
          selector: sel.startsWith('/') || sel.includes('(') ? undefined : sel,
          regex: sel.startsWith('/') || sel.includes('(') ? sel : undefined,
          regexGroup: 1,
        };
        return { ...prev, blueprint: { ...prev.blueprint, fieldMap } };
      });
      setFieldGuesses((prev) =>
        prev.map((g) =>
          g.key === field ? { ...g, confidence: 0.92, level: 'high', manuallyFixed: true } : g
        )
      );
      setActiveFixField(null);
      setManualSelector('');
      toast.success('فیلد به‌روز شد');
    },
    [manualSelector]
  );

  const previewListPage = useCallback(
    (url: string) => {
      setState((prev) => ({ ...prev, listingsUrl: url }));
      toast.info('آدرس لیست به‌روز شد — تست استخراج را اجرا کنید');
    },
    []
  );

  const pollOnboardJob = useCallback(
    (jobId: string) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        void (async () => {
          try {
            const status = (await apiFetch(
              `/api/super-admin/filing-scrapers/ai-onboard/${jobId}/status`
            )) as {
              status?: string;
              step?: string;
              progress?: number;
              error?: string;
              result?: AiOnboardResult;
            };
            const mapped = stepsFromJobPayload({
              ...status,
              hasCredentials: Boolean(state.username.trim() && state.password.trim()),
            });
            setOnboardSteps(mapped.steps);
            setOnboardProgress(mapped.progress);

            if (status.status === 'completed' && status.result) {
              if (pollRef.current) clearInterval(pollRef.current);
              setAutoOnboardLoading(false);
              applyOnboardResult(status.result);
              toast.success(
                status.result.mode === 'public_map' ? 'نقشه پورتال آماده شد' : 'کشف هوشمند کامل شد'
              );
            } else if (status.status === 'failed') {
              if (pollRef.current) clearInterval(pollRef.current);
              setAutoOnboardLoading(false);
              setOnboardError(formatApiError(status.error ?? status, 'کشف ناموفق'));
              toast.error(formatApiError(status.error ?? status, 'کشف ناموفق'));
            }
          } catch (e) {
            if (pollRef.current) clearInterval(pollRef.current);
            setAutoOnboardLoading(false);
            setOnboardError(e instanceof Error ? e.message : 'خطا در polling');
          }
        })();
      }, 1500);
    },
    [apiFetch, applyOnboardResult, state.password, state.username]
  );

  const runAiOnboard = useCallback(async () => {
    if (!state.loginUrl.trim()) {
      toast.error('آدرس سایت را وارد کنید');
      return;
    }

    const hasCreds = Boolean(state.username.trim() && state.password.trim());
    setAutoOnboardLoading(true);
    setOnboardReport(null);
    setOnboardError(null);
    setOnboardProgress(0.1);
    setOnboardSteps(
      stepsFromJobPayload({
        step: hasCreds ? 'login' : 'crawl',
        progress: 0.1,
        hasCredentials: hasCreds,
      }).steps
    );

    try {
      const res = (await apiFetch('/api/super-admin/filing-scrapers/ai-onboard', {
        method: 'POST',
        body: JSON.stringify({
          siteKey: resolvedSiteKey,
          loginUrl: state.loginUrl.trim(),
          listingsUrl: state.listingsUrl.trim(),
          ...(hasCreds
            ? { username: state.username.trim(), password: state.password }
            : {}),
          userCity: state.defaultCity.trim(),
          siteConfig: state.blueprint,
          asyncJob: true,
        }),
      })) as { jobId?: string; status?: string } & AiOnboardResult;

      if (res.jobId) {
        pollOnboardJob(res.jobId);
        return;
      }

      applyOnboardResult(res);
      setOnboardProgress(1);
      setOnboardSteps(
        stepsFromJobPayload({ status: 'completed', progress: 1, result: res, hasCredentials: hasCreds }).steps
      );
      toast.success(hasCreds ? 'کشف هوشمند کامل شد' : 'نقشه پورتال آماده شد');
    } catch (e) {
      setOnboardError(formatApiError(e instanceof Error ? e.message : e, 'کشف ناموفق'));
      toast.error(formatApiError(e instanceof Error ? e.message : e, 'کشف ناموفق'));
    } finally {
      if (!pollRef.current) setAutoOnboardLoading(false);
    }
  }, [
    apiFetch,
    applyOnboardResult,
    pollOnboardJob,
    state.blueprint,
    state.defaultCity,
    state.loginUrl,
    state.listingsUrl,
    state.password,
    state.username,
    resolvedSiteKey,
  ]);

  const runPreview = async (maxItems = 5) => {
    setPreviewLoading(true);
    try {
      const payload = {
        ...(scraperId ? { scraperId } : {}),
        siteKey: resolvedSiteKey,
        loginUrl: state.loginUrl,
        listingsUrl: state.listingsUrl,
        username: state.username,
        password: state.password,
        defaultCity: state.defaultCity,
        defaultNeighborhood: state.defaultNeighborhood || null,
        siteConfig: state.blueprint,
        maxItems,
      };
      const res = (await apiFetch<{
        ok: boolean;
        listings: NormalizedScrapedRow[];
        pageUrl?: string;
        extractMethod?: string;
        error?: string;
      }>('/api/super-admin/filing-scrapers/preview', {
        method: 'POST',
        body: JSON.stringify(payload),
      }));
      if (!res.ok) throw new Error(res.error ?? 'پیش‌نمایش ناموفق');
      setPreviewRows(res.listings);
      setPreviewMeta({ pageUrl: res.pageUrl, extractMethod: res.extractMethod });
      const n = res.listings.length;
      const rate = (fn: (r: NormalizedScrapedRow) => boolean) =>
        n ? res.listings.filter(fn).length / n : 0;
      const dealGroups = new Map<string, NormalizedScrapedRow[]>();
      for (const row of res.listings) {
        const key = row.dealType || 'unknown';
        const bucket = dealGroups.get(key) ?? [];
        bucket.push(row);
        dealGroups.set(key, bucket);
      }
      const dealCoverage = Array.from(dealGroups.entries())
        .map(([deal, items]) => {
          const m = items.length;
          const priceHit = items.filter((r) => Boolean(r.price || r.deposit || r.monthlyRent)).length;
          const docHit = items.filter((r) => Boolean(r.documentType)).length;
          return `${deal}: قیمت ${Math.round((priceHit / m) * 100)}٪ · سند ${Math.round((docHit / m) * 100)}٪`;
        })
        .join(' · ');
      setEvalReport({
        count: n,
        fileCodeRate: rate((r) => Boolean(r.fileCode || r.externalId)),
        titleRate: rate((r) => r.title.length >= 6),
        priceRate: rate((r) => Boolean(r.price || r.deposit || r.monthlyRent)),
        dealTypeRate: rate((r) => Boolean(r.dealType)),
        attributeRate: rate((r) =>
          Boolean(r.documentType || r.buildingAge || r.floor || r.totalFloors || r.cabinet)
        ),
        dealCoverage,
        extractMethod: res.extractMethod,
      });
      toast.success(`${res.listings.length} فایل استخراج شد`);
    } catch (e) {
      toast.error(formatApiError(e instanceof Error ? e.message : e, 'پیش‌نمایش ناموفق'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const runEval100 = () => void runPreview(100);

  const saveScraper = async () => {
    if (!state.loginUrl.trim()) {
      toast.error('آدرس ورود الزامی است');
      return;
    }
    if (!scraperId && !state.password.trim()) {
      const hasBlueprint = Boolean(state.blueprint.listPage?.containerSelector);
      if (!hasBlueprint) {
        toast.error('رمز عبور یا نقشه سایت (بدون ورود) الزامی است');
        return;
      }
    }
    const gate = discoveryGateOk(fieldGuesses);
    if (!gate.ok && fieldGuesses.length > 0) {
      toast.warning(`فیلدهای ضعیف: ${gate.missing.join('، ')}`);
    }
    if (!state.blueprint.listPage?.containerSelector && !state.listingsUrl.trim()) {
      toast.error('ابتدا کشف هوشمند را اجرا کنید');
      return;
    }

    setSaving(true);
    try {
      const displayName =
        state.name.trim() || deriveDisplayNameFromLoginUrl(state.loginUrl) || resolvedSiteKey;
      const payload = {
        name: displayName,
        ...(scraperId ? {} : { siteKey: resolvedSiteKey }),
        enabled: true,
        loginUrl: state.loginUrl.trim(),
        listingsUrl: state.listingsUrl.trim() || state.loginUrl.trim(),
        username: state.username.trim(),
        ...(state.password.trim() ? { password: state.password } : {}),
        defaultCity: state.defaultCity.trim(),
        defaultNeighborhood: state.defaultNeighborhood.trim() || null,
        intervalMinutes: Number(state.intervalMinutes) || 10,
        jitterMinutes: Number(state.jitterMinutes) || 4,
        siteConfig: state.blueprint,
      };

      if (scraperId) {
        await apiFetch(`/api/super-admin/filing-scrapers/${scraperId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('ربات به‌روز شد');
      } else {
        await apiFetch('/api/super-admin/filing-scrapers', {
          method: 'POST',
          body: JSON.stringify({
            ...payload,
            ...(state.password.trim() ? { password: state.password } : {}),
          }),
        });
        toast.success('ربات ایجاد شد');
      }
      onClose();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ذخیره ناموفق');
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[300] flex flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border/60 px-4 py-3">
        <Button type="button" variant="ghost" size="icon" onClick={onClose}>
          <X className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-base font-bold">
            <Globe className="size-4 text-primary" />
            ویزارد کراول فایلینگ
          </h1>
          <p className="text-xs text-muted-foreground">
            مرحله {step + 1} از {STEPS.length}: {STEPS[step]}
          </p>
        </div>
        <div className="hidden flex-wrap gap-1 sm:flex">
          {STEPS.map((label, i) => (
            <Badge
              key={label}
              variant={i === step ? 'default' : i < step ? 'secondary' : 'outline'}
              className="text-[10px]"
            >
              {i + 1}. {label}
            </Badge>
          ))}
        </div>
      </header>

      {loadingScraper ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 lg:flex-row lg:gap-4">
          <div className="min-h-0 flex-1 space-y-4 lg:max-w-2xl">
            {step === 0 && (
              <div className="grid gap-3">
                <p className="rounded-lg border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
                  آدرس سایت (صفحه اصلی یا ورود) + شهر کافی است. سیستم بدون ورود نقشه دسته‌ها (رهن،
                  فروش، …) و صفحات لیست را می‌سازد. یوزر/پس فقط برای فیلدهای مخفی مثل شماره مالک لازم
                  است.
                </p>
                <div className="space-y-1.5">
                  <Label>آدرس سایت / ورود</Label>
                  <Input
                    value={state.loginUrl}
                    onChange={(e) => setState((s) => ({ ...s, loginUrl: e.target.value }))}
                    placeholder="https://example.com/login"
                    dir="ltr"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>نام کاربری (اختیاری)</Label>
                    <Input value={state.username} onChange={(e) => setState((s) => ({ ...s, username: e.target.value }))} dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>رمز عبور (اختیاری)</Label>
                    <Input
                      type="password"
                      value={state.password}
                      onChange={(e) => setState((s) => ({ ...s, password: e.target.value }))}
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>شهر فایل‌ها</Label>
                  <Input value={state.defaultCity} onChange={(e) => setState((s) => ({ ...s, defaultCity: e.target.value }))} />
                </div>
                <details className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm">
                  <summary className="cursor-pointer font-medium text-muted-foreground">تنظیمات اختیاری</summary>
                  <div className="mt-3 grid gap-3">
                    <div className="space-y-1.5">
                      <Label>پورتال شناخته‌شده (اختیاری)</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={selectedPortalKey}
                        onChange={(e) => {
                          const key = e.target.value;
                          setSelectedPortalKey(key);
                          const portal = IRAN_FILING_PORTALS.find((p) => p.siteKey === key);
                          if (portal) {
                            setState((s) => ({
                              ...s,
                              ...applyPortalToWizardDefaults(portal, s),
                            }));
                          }
                        }}
                      >
                        {IRAN_FILING_PORTALS.map((p) => (
                          <option key={p.siteKey} value={p.siteKey}>
                            {p.name} ({portalStatusLabel(p.status)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>نام ربات (اختیاری)</Label>
                      <Input
                        value={state.name}
                        onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
                        placeholder={deriveDisplayNameFromLoginUrl(state.loginUrl) || 'از روی آدرس ورود'}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>آدرس لیست فایل‌ها (اختیاری)</Label>
                      <Input
                        value={state.listingsUrl}
                        onChange={(e) => setState((s) => ({ ...s, listingsUrl: e.target.value }))}
                        dir="ltr"
                      />
                    </div>
                  </div>
                </details>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <AiOnboardProgress
                  steps={onboardSteps}
                  progress={onboardProgress}
                  error={onboardError}
                />
                <Button
                  type="button"
                  className="admin-btn-primary w-full"
                  onClick={() => void runAiOnboard()}
                  disabled={autoOnboardLoading}
                >
                  {autoOnboardLoading ? (
                    <Loader2 className="size-4 animate-spin ml-1" />
                  ) : (
                    <Sparkles className="size-4 ml-1" />
                  )}
                  {autoOnboardLoading
                    ? 'در حال نقشه‌سازی…'
                    : state.username.trim() && state.password.trim()
                      ? 'نقشه‌سازی + کراول کامل'
                      : 'ساخت نقشه سایت (بدون ورود)'}
                </Button>
                <SiteMapPanel siteMap={portalSiteMap} onSelectListPage={previewListPage} />
                {portalSiteMap?.loginRequired && !(state.username.trim() && state.password.trim()) ? (
                  <div className="rounded-lg border border-amber-400/40 bg-amber-50/30 p-3 text-[11px] text-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
                    برخی فیلدها (مثل موبایل مالک) تا ورود مخفی هستند. یوزر/پس را در مرحله قبل وارد کنید و دوباره «نقشه‌سازی + کراول کامل» را بزنید.
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 w-full"
                      onClick={() => setStep(0)}
                    >
                      رفتن به تنظیمات ورود
                    </Button>
                  </div>
                ) : null}
                <PortalScanMap
                  siteIndex={siteIndex}
                  regions={scanRegions}
                  activeRegionId={activeRegionId}
                  scanning={false}
                  autoOnboarding={autoOnboardLoading}
                  onScan={() => void runAiOnboard()}
                  onAutoOnboard={() => void runAiOnboard()}
                  onSelectRegion={(r) => setActiveRegionId(r.id)}
                  onFixRegion={(r) => {
                    if (r.pickTarget?.startsWith('field:')) {
                      setActiveFixField(r.pickTarget.replace('field:', ''));
                    } else {
                      setActiveFixField(r.pickTarget);
                    }
                  }}
                />
                {onboardReport ? (
                  <p className="rounded-lg border border-sky-400/30 bg-sky-50/40 p-2 text-[11px] text-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
                    {onboardReport}
                  </p>
                ) : null}
                {state.blueprint.listPage?.containerSelector ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => void runEval100()}
                    disabled={previewLoading}
                  >
                    {previewLoading ? (
                      <Loader2 className="size-4 animate-spin ml-1" />
                    ) : (
                      <Sparkles className="size-4 ml-1" />
                    )}
                    تست ۱۰۰ فایل
                  </Button>
                ) : null}
                {evalReport ? (
                  <p className="rounded-lg border border-emerald-400/30 bg-emerald-50/40 p-2 text-[11px] text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                    ارزیابی: {evalReport.count} فایل · کد{' '}
                    {(evalReport.fileCodeRate * 100).toFixed(0)}% · عنوان{' '}
                    {(evalReport.titleRate * 100).toFixed(0)}% · قیمت/رهن{' '}
                    {(evalReport.priceRate * 100).toFixed(0)}% · معامله{' '}
                    {(evalReport.dealTypeRate * 100).toFixed(0)}% · مشخصات{' '}
                    {(evalReport.attributeRate * 100).toFixed(0)}%
                    {evalReport.dealCoverage ? ` · ${evalReport.dealCoverage}` : ''}
                    {evalReport.extractMethod ? ` · ${evalReport.extractMethod}` : ''}
                  </p>
                ) : null}
                <FieldConfidenceGrid
                  guesses={fieldGuesses}
                  activeFixField={activeFixField}
                  onFixField={(field) => {
                    setActiveFixField((prev) => (prev === field ? null : field));
                    setManualSelector('');
                  }}
                />
                {activeFixField ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 p-2">
                    <Input
                      value={manualSelector}
                      onChange={(e) => setManualSelector(e.target.value)}
                      placeholder="CSS selector یا regex"
                      className="h-8 flex-1 text-xs"
                      dir="ltr"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        applyManualFieldFix(activeFixField as keyof NonNullable<CrawlBlueprint['fieldMap']>)
                      }
                    >
                      ذخیره فیلد
                    </Button>
                  </div>
                ) : null}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" className="admin-btn-primary" onClick={() => void runPreview(5)} disabled={previewLoading}>
                    {previewLoading ? <Loader2 className="size-4 animate-spin ml-1" /> : <Sparkles className="size-4 ml-1" />}
                    اجرای تست (۵ فایل)
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void runEval100()} disabled={previewLoading}>
                    تست ۱۰۰ فایل
                  </Button>
                </div>
                {evalReport ? (
                  <p className="text-xs text-muted-foreground">
                    پوشش: کد {(evalReport.fileCodeRate * 100).toFixed(0)}% · عنوان{' '}
                    {(evalReport.titleRate * 100).toFixed(0)}% · قیمت {(evalReport.priceRate * 100).toFixed(0)}% · معامله{' '}
                    {(evalReport.dealTypeRate * 100).toFixed(0)}% · مشخصات {(evalReport.attributeRate * 100).toFixed(0)}%
                    {evalReport.dealCoverage ? ` · ${evalReport.dealCoverage}` : ''}
                  </p>
                ) : null}
                {previewMeta.extractMethod ? (
                  <p className="text-xs text-muted-foreground">
                    روش: {previewMeta.extractMethod}
                    {previewMeta.pageUrl ? ` · ${previewMeta.pageUrl}` : ''}
                  </p>
                ) : null}
                <div className="overflow-x-auto rounded-lg border border-border/60">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 text-right">
                        <th className="p-2">عنوان</th>
                        <th className="p-2">کد</th>
                        <th className="p-2">محله</th>
                        <th className="p-2">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-b border-border/40">
                          <td className="max-w-[10rem] truncate p-2">{row.title}</td>
                          <td className="p-2">{row.fileCode ?? '—'}</td>
                          <td className="p-2">{row.neighborhood ?? '—'}</td>
                          <td className="p-2">
                            <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>
                              {row.status === 'active' ? 'تأیید' : 'بررسی'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>محله پیش‌فرض</Label>
                    <Input value={state.defaultNeighborhood} onChange={(e) => setState((s) => ({ ...s, defaultNeighborhood: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>فاصله (دقیقه)</Label>
                    <Input value={state.intervalMinutes} onChange={(e) => setState((s) => ({ ...s, intervalMinutes: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>jitter (دقیقه)</Label>
                    <Input value={state.jitterMinutes} onChange={(e) => setState((s) => ({ ...s, jitterMinutes: e.target.value }))} />
                  </div>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <ul className="mb-3 space-y-1 text-xs text-muted-foreground">
                    <li>ربات: {state.name.trim() || deriveDisplayNameFromLoginUrl(state.loginUrl) || resolvedSiteKey}</li>
                    <li>لیست: {state.listingsUrl || '—'}</li>
                    <li>container: {state.blueprint.listPage?.containerSelector ?? '—'}</li>
                    <li>فیلدهای map: {Object.keys(state.blueprint.fieldMap ?? {}).length}</li>
                  </ul>
                  <Button type="button" className="admin-btn-primary w-full" onClick={() => void saveScraper()} disabled={saving}>
                    {saving ? <Loader2 className="size-4 animate-spin ml-1" /> : <Save className="size-4 ml-1" />}
                    {scraperId ? 'ذخیره تغییرات' : 'ایجاد ربات'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-border/60 px-4 py-3">
        <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          <ArrowRight className="size-4 ml-1" />
          قبلی
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            className="admin-btn-primary"
            onClick={() => {
              if (step === 1 && !siteIndex && !portalSiteMap) {
                toast.warning('ابتدا «ساخت نقشه سایت» را بزنید');
              }
              setStep((s) => Math.min(STEPS.length - 1, s + 1));
            }}
          >
            بعدی
            <ArrowLeft className="size-4 mr-1" />
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={onClose}>
            <Check className="size-4 ml-1" />
            بستن
          </Button>
        )}
      </footer>
    </div>
  );

  return createPortal(content, document.body);
}

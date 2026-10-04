'use client';

import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AiOnboardStep = {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
};

const DEFAULT_STEPS: AiOnboardStep[] = [
  { id: 'login', label: 'ورود به پورتال', status: 'pending' },
  { id: 'discover', label: 'یافتن صفحه لیست فایل‌ها', status: 'pending' },
  { id: 'fields', label: 'استخراج فیلدهای ملکی', status: 'pending' },
  { id: 'preview', label: 'تست استخراج نمونه', status: 'pending' },
];

export function AiOnboardProgress({
  steps = DEFAULT_STEPS,
  progress = 0,
  error,
  className,
}: {
  steps?: AiOnboardStep[];
  progress?: number;
  error?: string | null;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border/60 bg-muted/20 p-4', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold">کشف هوشمند با ScrapeGraph + AI</h3>
        <span className="text-[11px] text-muted-foreground">{Math.round(progress * 100)}%</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        />
      </div>
      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.id} className="flex items-start gap-2 text-xs">
            {step.status === 'running' ? (
              <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-primary" />
            ) : step.status === 'done' ? (
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
            ) : step.status === 'error' ? (
              <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            ) : (
              <Circle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
            )}
            <div className="min-w-0 flex-1">
              <p className={cn('font-medium', step.status === 'pending' && 'text-muted-foreground')}>
                {step.label}
              </p>
              {step.detail ? (
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground" dir="ltr">
                  {step.detail}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {error ? (
        <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-[11px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function stepsFromJobPayload(payload: {
  step?: string;
  progress?: number;
  status?: string;
  error?: string | null;
  hasCredentials?: boolean;
  result?: {
    mode?: 'public_map' | 'authenticated';
    listingsUrl?: string;
    previewListings?: unknown[];
    pagesVisited?: number;
    telemetry?: Array<{ event?: string; listingsUrl?: string; count?: number }>;
  };
}): { steps: AiOnboardStep[]; progress: number } {
  const progress = typeof payload.progress === 'number' ? payload.progress : 0;
  const step = payload.step ?? 'queued';
  const result = payload.result;
  const telemetry = result?.telemetry ?? [];
  const publicMap = result?.mode === 'public_map' || (!payload.hasCredentials && step === 'crawl');

  if (publicMap || (!payload.hasCredentials && step !== 'login')) {
    const crawlDone =
      telemetry.some((t) => t.event === 'site_map') ||
      (typeof result?.pagesVisited === 'number' && result.pagesVisited > 0) ||
      step === 'done';
    const taxonomyDone = telemetry.some((t) => t.event === 'taxonomy') || crawlDone;
    const fieldsDone = Boolean(result?.listingsUrl) || crawlDone;
    const failed = payload.status === 'failed';

    const steps: AiOnboardStep[] = [
      {
        id: 'crawl',
        label: 'پیمایش صفحات سایت',
        status: failed && step === 'crawl' ? 'error' : crawlDone ? 'done' : step === 'crawl' ? 'running' : 'pending',
        detail: result?.pagesVisited ? `${result.pagesVisited} صفحه` : undefined,
      },
      {
        id: 'taxonomy',
        label: 'شناسایی دسته‌ها (رهن، فروش، …)',
        status: failed && crawlDone && !taxonomyDone ? 'error' : taxonomyDone ? 'done' : crawlDone ? 'running' : 'pending',
      },
      {
        id: 'fields',
        label: 'نقشه فیلدهای قابل مشاهده',
        status: fieldsDone ? 'done' : taxonomyDone ? 'running' : 'pending',
        detail: result?.listingsUrl,
      },
      {
        id: 'login-hint',
        label: 'فیلدهای مخفی (شماره مالک)',
        status: 'pending',
        detail: payload.hasCredentials ? undefined : 'بعداً با یوزر/پس',
      },
    ];
    return { steps, progress };
  }

  const loginDone = telemetry.some((t) => t.event === 'login') || step === 'discover' || step === 'done';
  const discoverDone =
    telemetry.some((t) => t.event === 'discover') || Boolean(result?.listingsUrl) || step === 'done';
  const previewDone =
    telemetry.some((t) => t.event === 'preview') ||
    (Array.isArray(result?.previewListings) && result.previewListings.length > 0) ||
    step === 'done';

  const failed = payload.status === 'failed';

  const steps: AiOnboardStep[] = [
    {
      id: 'login',
      label: 'ورود به پورتال',
      status: failed && step === 'login' ? 'error' : loginDone ? 'done' : step === 'login' ? 'running' : 'pending',
    },
    {
      id: 'discover',
      label: 'یافتن صفحه لیست فایل‌ها',
      status:
        failed && !loginDone
          ? 'pending'
          : failed && !discoverDone
            ? 'error'
            : discoverDone
              ? 'done'
              : loginDone
                ? 'running'
                : 'pending',
      detail: result?.listingsUrl,
    },
    {
      id: 'fields',
      label: 'استخراج فیلدهای ملکی',
      status: discoverDone ? 'done' : loginDone ? 'running' : 'pending',
    },
    {
      id: 'preview',
      label: 'تست استخراج نمونه',
      status:
        failed && discoverDone && !previewDone
          ? 'error'
          : previewDone
            ? 'done'
            : discoverDone
              ? 'running'
              : 'pending',
      detail:
        Array.isArray(result?.previewListings) && result.previewListings.length > 0
          ? `${result.previewListings.length} فایل`
          : undefined,
    },
  ];

  return { steps, progress };
}

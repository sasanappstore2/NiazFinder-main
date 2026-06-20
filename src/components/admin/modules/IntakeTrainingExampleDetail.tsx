'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminBadge } from '@/components/admin/ui';
import { apiFetch } from '@/lib/api-client';

interface TrainingExampleDetail {
  id: string;
  sourceText: string;
  needType: string | null;
  publishedAt: string;
  reviewed: boolean;
  hasUserCorrections: boolean;
  correctionFields: string[];
  qualityFlags: string[];
  qualityScore: number | null;
  ruleResult: unknown;
  aiResult: unknown;
  finalEntities: unknown;
  correctedEntities: unknown;
  intakeTrace: unknown;
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="max-h-48 overflow-auto rounded-lg bg-(--color-inputBg) p-3 text-[11px] leading-relaxed">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export function IntakeTrainingExampleDetail({
  id,
  onClose,
  onUpdated,
}: {
  id: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [row, setRow] = useState<TrainingExampleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<TrainingExampleDetail>(
        `/api/super-admin/intake-training/${encodeURIComponent(id)}`
      );
      setRow(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const markGold = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/super-admin/intake-training/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ reviewed: true, qualityScore: 1 }),
      });
      onUpdated();
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'خطا');
    } finally {
      setSaving(false);
    }
  };

  const trace = row?.intakeTrace as {
    analysisSnapshot?: {
      intentGist?: string;
      recommendedQuestions?: string[];
      fieldMeta?: Record<string, { value?: unknown; source?: string }>;
    };
  } | null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-(--color-cardBorder) bg-(--color-primaryBg) p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-(--color-primaryText)">جزئیات نمونه</h3>
            {row?.reviewed ? (
              <AdminBadge variant="success" className="mt-1">
                <CheckCircle2 className="size-3" /> Gold
              </AdminBadge>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {loading ? <p className="text-sm text-(--color-secondaryText)">بارگذاری...</p> : null}
        {error ? <p className="text-sm text-(--color-danger)">{error}</p> : null}

        {row ? (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs font-medium text-(--color-secondaryText)">متن کاربر</p>
              <p className="rounded-lg bg-(--color-inputBg) p-3 text-sm leading-relaxed">{row.sourceText}</p>
            </div>

            {trace?.analysisSnapshot?.intentGist ? (
              <div>
                <p className="mb-1 text-xs font-medium text-(--color-secondaryText)">خلاصه AI (intentGist)</p>
                <p className="text-sm">{trace.analysisSnapshot.intentGist}</p>
              </div>
            ) : null}

            {row.hasUserCorrections ? (
              <div>
                <p className="mb-1 text-xs font-medium text-(--color-secondaryText)">فیلدهای اصلاح‌شده</p>
                <div className="flex flex-wrap gap-1">
                  {row.correctionFields.map((f) => (
                    <AdminBadge key={f} variant="warning">
                      {f}
                    </AdminBadge>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-(--color-secondaryText)">پیش‌بینی AI</p>
                <JsonBlock data={row.aiResult} />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-(--color-secondaryText)">نتیجه نهایی</p>
                <JsonBlock data={row.finalEntities} />
              </div>
            </div>

            {row.correctedEntities ? (
              <div>
                <p className="mb-1 text-xs font-medium text-(--color-secondaryText)">correctedEntities</p>
                <JsonBlock data={row.correctedEntities} />
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-2">
              {!row.reviewed ? (
                <Button type="button" disabled={saving} onClick={() => void markGold()}>
                  تأیید برای Gold
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={onClose}>
                بستن
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

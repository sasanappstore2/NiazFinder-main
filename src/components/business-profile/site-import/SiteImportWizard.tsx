'use client';

import { useCallback, useMemo, useState } from 'react';
import { Globe, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { getClientAuthJsonHeaders } from '@/lib/auth/client-auth';
import type { SiteImportPreviewResult, SiteImportSuggestion } from '@/lib/business/site-import/types';
import { cn } from '@/lib/utils';

const GROUP_LABELS: Record<SiteImportSuggestion['group'], string> = {
  brand: '\u0628\u0631\u0646\u062f \u0648 \u062a\u0648\u0636\u06cc\u062d\u0627\u062a',
  storefront_categories: '\u062f\u0633\u062a\u0647\u200c\u0628\u0646\u062f\u06cc \u0641\u0631\u0648\u0634\u06af\u0627\u0647',
  products: '\u0645\u062d\u0635\u0648\u0644\u0627\u062a / \u062e\u062f\u0645\u0627\u062a',
  seo: 'SEO',
  social: '\u0634\u0628\u06a9\u0647\u200c\u0647\u0627\u06cc \u0627\u062c\u062a\u0645\u0627\u0639\u06cc',
};

function SuggestionPreview({ suggestion }: { suggestion: SiteImportSuggestion }) {
  const preview = suggestion.preview;
  if (!preview || typeof preview !== 'object') {
    return <p className="text-xs text-muted-foreground">\u2014</p>;
  }
  const p = preview as Record<string, unknown>;

  if (Array.isArray(p.categories)) {
    return (
      <ul className="flex flex-wrap gap-1.5">
        {(p.categories as string[]).map((c) => (
          <Badge key={c} variant="secondary" className="text-xs">
            {c}
          </Badge>
        ))}
      </ul>
    );
  }

  if (Array.isArray(p.products) || Array.isArray(p.services)) {
    const items = (p.products ?? p.services) as Array<Record<string, string>>;
    return (
      <ul className="space-y-1 text-xs text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="overflow-guard">
            <span className="font-medium text-foreground">{item.title}</span>
            {item.priceRange || item.price ? ` \u00b7 ${item.priceRange ?? item.price}` : ''}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof p.description === 'string') {
    return <p className="line-clamp-3 text-xs text-muted-foreground">{p.description}</p>;
  }

  return (
    <pre className="max-h-24 overflow-auto text-xs text-muted-foreground whitespace-pre-wrap">
      {JSON.stringify(preview, null, 2)}
    </pre>
  );
}

export function SiteImportWizard({
  websiteUrl,
  occupationSlugs = [],
  onApplied,
  className,
}: {
  websiteUrl: string;
  occupationSlugs?: string[];
  onApplied?: (result: SiteImportPreviewResult) => void;
  className?: string;
}) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'review' | 'applying' | 'done'>('idle');
  const [preview, setPreview] = useState<SiteImportPreviewResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applyErrors, setApplyErrors] = useState<string[]>([]);

  const runPreview = useCallback(async () => {
    const url = websiteUrl.trim();
    if (!url) {
      toast.error('\u0622\u062f\u0631\u0633 \u0648\u0628\u200c\u0633\u0627\u06cc\u062a \u0631\u0627 \u0648\u0627\u0631\u062f \u06a9\u0646\u06cc\u062f');
      return;
    }
    setPhase('loading');
    setApplyErrors([]);
    try {
      const res = await fetch('/api/business/me/site-import/preview', {
        method: 'POST',
        headers: getClientAuthJsonHeaders(),
        body: JSON.stringify({ url, occupationSlugs }),
      });
      const data = (await res.json()) as SiteImportPreviewResult & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? '\u062e\u0637\u0627 \u062f\u0631 \u062f\u0631\u06cc\u0627\u0641\u062a \u067e\u06cc\u0634\u0646\u0647\u0627\u062f\u0647\u0627');
      }
      setPreview(data);
      setSelected(new Set(data.suggestions.map((s) => s.id)));
      setPhase('review');
      if (data.suggestions.length === 0) {
        toast.message('\u0645\u0648\u0631\u062f \u0642\u0627\u0628\u0644 \u067e\u06cc\u0634\u0646\u0647\u0627\u062f\u06cc \u0627\u0632 \u0633\u0627\u06cc\u062a \u06cc\u0627\u0641\u062a \u0646\u0634\u062f');
      }
      if (data.warnings?.length) {
        data.warnings.forEach((w) => toast.message(w));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '\u062e\u0637\u0627 \u062f\u0631 \u062f\u0631\u06cc\u0627\u0641\u062a \u0627\u0637\u0644\u0627\u0639\u0627\u062a \u0627\u0632 \u0633\u0627\u06cc\u062a');
      setPhase('idle');
    }
  }, [websiteUrl, occupationSlugs]);

  const grouped = useMemo(() => {
    if (!preview) return [];
    const map = new Map<SiteImportSuggestion['group'], SiteImportSuggestion[]>();
    for (const s of preview.suggestions) {
      const list = map.get(s.group) ?? [];
      list.push(s);
      map.set(s.group, list);
    }
    return [...map.entries()];
  }, [preview]);

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const applySelected = async () => {
    if (!preview || selected.size === 0) {
      toast.error('\u062d\u062f\u0627\u0642\u0644 \u06cc\u06a9 \u067e\u06cc\u0634\u0646\u0647\u0627\u062f \u0631\u0627 \u0627\u0646\u062a\u062e\u0627\u0628 \u06a9\u0646\u06cc\u062f');
      return;
    }
    if (!preview.previewToken) {
      toast.error('\u067e\u06cc\u0634\u200c\u0646\u0645\u0627\u06cc\u0634 \u0645\u0646\u0642\u0636\u06cc \u0634\u062f\u0647\u061b \u062f\u0648\u0628\u0627\u0631\u0647 \u062f\u0631\u06cc\u0627\u0641\u062a \u0627\u0637\u0644\u0627\u0639\u0627\u062a \u0631\u0627 \u0628\u0632\u0646\u06cc\u062f');
      return;
    }
    setPhase('applying');
    setApplyErrors([]);
    try {
      const res = await fetch('/api/business/me/site-import/apply', {
        method: 'POST',
        headers: getClientAuthJsonHeaders(),
        body: JSON.stringify({
          previewToken: preview.previewToken,
          suggestionIds: [...selected],
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        applied?: string[];
        errors?: { id: string; message: string }[];
      };
      if (!res.ok) throw new Error(data.error ?? '\u0627\u0639\u0645\u0627\u0644 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062f');

      const partialErrors = (data.errors ?? []).map((e) => e.message);
      if (partialErrors.length > 0) {
        setApplyErrors(partialErrors);
        toast.message(`\u0628\u0631\u062e\u06cc \u0645\u0648\u0627\u0631\u062f \u0627\u0639\u0645\u0627\u0644 \u0646\u0634\u062f (${partialErrors.length})`);
      }

      const appliedCount = data.applied?.length ?? 0;
      if (appliedCount > 0) {
        toast.success(`${appliedCount} \u067e\u06cc\u0634\u0646\u0647\u0627\u062f \u0627\u0639\u0645\u0627\u0644 \u0634\u062f`);
        setPhase('done');
        onApplied?.(preview);
      } else if (partialErrors.length > 0) {
        setPhase('review');
      } else {
        toast.error('\u0647\u06cc\u0686 \u067e\u06cc\u0634\u0646\u0647\u0627\u062f\u06cc \u0627\u0639\u0645\u0627\u0644 \u0646\u0634\u062f');
        setPhase('review');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '\u062e\u0637\u0627 \u062f\u0631 \u0627\u0639\u0645\u0627\u0644');
      setPhase('review');
    }
  };

  if (phase === 'idle' || phase === 'loading') {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn('gap-2', className)}
        disabled={phase === 'loading' || !websiteUrl.trim()}
        onClick={() => void runPreview()}
      >
        {phase === 'loading' ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4 text-emerald-600" />
        )}
        {phase === 'loading' ? '\u062f\u0631 \u062d\u0627\u0644 \u0628\u0631\u0631\u0633\u06cc \u0633\u0627\u06cc\u062a \u0634\u0645\u0627\u2026' : '\u062f\u0631\u06cc\u0627\u0641\u062a \u0627\u0637\u0644\u0627\u0639\u0627\u062a \u0627\u0632 \u0633\u0627\u06cc\u062a'}
      </Button>
    );
  }

  if (!preview) return null;

  return (
    <div className={cn('rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-4', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Globe className="size-4 text-emerald-600" />
        <span className="text-sm font-medium">\u067e\u06cc\u0634\u0646\u0647\u0627\u062f\u0627\u062a \u0648\u0627\u0631\u062f\u0627\u062a \u0627\u0632 \u0633\u0627\u06cc\u062a</span>
        <Badge variant="secondary">{preview.siteType}</Badge>
        <Badge variant="outline" className="text-xs">
          \u0627\u0637\u0645\u06cc\u0646\u0627\u0646 {Math.round(preview.confidence * 100)}\u066a
        </Badge>
      </div>

      {phase !== 'done' && preview.suggestions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          \u0627\u0632 \u0627\u06cc\u0646 \u0622\u062f\u0631\u0633 \u062f\u0627\u062f\u0647\u200c\u0627\u06cc \u0628\u0631\u0627\u06cc \u067e\u06cc\u0634\u0646\u0647\u0627\u062f \u06cc\u0627\u0641\u062a \u0646\u0634\u062f. \u0645\u06cc\u200c\u062a\u0648\u0627\u0646\u06cc\u062f \u0641\u06cc\u0644\u062f\u0647\u0627 \u0631\u0627 \u062f\u0633\u062a\u06cc \u067e\u0631 \u06a9\u0646\u06cc\u062f \u06cc\u0627 \u0622\u062f\u0631\u0633 \u062f\u06cc\u06af\u0631\u06cc \u0627\u0645\u062a\u062d\u0627\u0646 \u06a9\u0646\u06cc\u062f.
        </p>
      )}

      {applyErrors.length > 0 && phase !== 'done' && (
        <ul className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          {applyErrors.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      )}

      {phase !== 'done' && preview.suggestions.length > 0 && (
        <div className="space-y-3">
          {grouped.map(([group, items]) => (
            <div key={group} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">{GROUP_LABELS[group]}</p>
              {items.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer gap-3 rounded-lg border border-border/60 bg-background/80 p-3"
                >
                  <Checkbox
                    checked={selected.has(s.id)}
                    onCheckedChange={(v) => toggle(s.id, Boolean(v))}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium">{s.labelFa}</p>
                    <SuggestionPreview suggestion={s} />
                    {s.sourceUrl ? (
                      <a
                        href={s.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-caption text-primary hover:underline"
                        dir="ltr"
                      >
                        \u0645\u0646\u0628\u0639
                      </a>
                    ) : null}
                  </div>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}

      {phase === 'done' ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">\u067e\u06cc\u0634\u0646\u0647\u0627\u062f\u0647\u0627 \u0628\u0627 \u0645\u0648\u0641\u0642\u06cc\u062a \u0627\u0639\u0645\u0627\u0644 \u0634\u062f.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={phase === 'applying' || selected.size === 0 || preview.suggestions.length === 0}
            onClick={() => void applySelected()}
          >
            {phase === 'applying' ? (
              <Loader2 className="ml-2 size-4 animate-spin" />
            ) : null}
            \u0627\u0639\u0645\u0627\u0644 \u067e\u06cc\u0634\u0646\u0647\u0627\u062f\u0647\u0627\u06cc \u0627\u0646\u062a\u062e\u0627\u0628\u200c\u0634\u062f\u0647 ({selected.size})
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setPhase('idle')}>
            \u0628\u0633\u062a\u0646
          </Button>
        </div>
      )}
    </div>
  );
}

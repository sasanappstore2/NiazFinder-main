'use client';

import { useCallback, useState } from 'react';
import { ChevronDown, ChevronUp, Cpu, Download, FlaskConical, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { EvalReport } from '@/lib/need-intake/dataset/eval-dataset';
import type { ParsedIntent } from '@/contracts/need-intake';

interface IntakeLabPanelProps {
  lastParsed: ParsedIntent | null;
  intakeMeta: {
    verticalScore?: number;
    verticalCertainty?: number;
    engine?: string;
    latencyMs?: number;
  } | null;
}

export function IntakeLabPanel({ lastParsed, intakeMeta }: IntakeLabPanelProps) {
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customResult, setCustomResult] = useState<Record<string, unknown> | null>(null);
  const [evalReport, setEvalReport] = useState<EvalReport | null>(null);
  const [running, setRunning] = useState(false);
  const [mlxHealth, setMlxHealth] = useState<{
    ok?: boolean;
    modelId?: string;
    loadError?: string | null;
    llmEnabled?: boolean;
    llmUrl?: string;
  } | null>(null);
  const [trainStatus, setTrainStatus] = useState<{
    status?: string;
    error?: string | null;
    log?: string[];
  } | null>(null);

  const runEval = useCallback(async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/need-intake/eval-fixtures');
      if (!res.ok) throw new Error('eval failed');
      const data = (await res.json()) as { report: EvalReport };
      setEvalReport(data.report);
    } finally {
      setRunning(false);
    }
  }, []);

  const exportDataset = useCallback(async () => {
    const res = await fetch('/api/need-intake/export-dataset', { method: 'POST' });
    if (!res.ok) throw new Error('export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'need-intake-train.jsonl';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const refreshMlxHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/need-intake/mlx-health');
      if (res.ok) setMlxHealth(await res.json());
    } catch {
      setMlxHealth({ ok: false, loadError: 'unreachable' });
    }
  }, []);

  const startMlxTrain = useCallback(async () => {
    const res = await fetch('/api/need-intake/mlx-train', { method: 'POST' });
    const data = await res.json();
    setTrainStatus(data);
  }, []);

  const pollTrainStatus = useCallback(async () => {
    const res = await fetch('/api/need-intake/mlx-train-status');
    if (res.ok) setTrainStatus(await res.json());
  }, []);

  const parseCustom = useCallback(async () => {
    const text = customText.trim();
    if (!text) return;
    const res = await fetch('/api/need-intake/parse-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    setCustomResult(data);
  }, [customText]);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-6 border border-dashed border-amber-500/50 rounded-lg bg-amber-500/5">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-amber-900 dark:text-amber-200"
        >
          <span className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            آزمایشگاه ثبت نیاز (dev)
          </span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => void runEval()} disabled={running}>
            <Play className="h-3.5 w-3.5 ml-1" />
            اجرای همه fixtures
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void exportDataset()}>
            <Download className="h-3.5 w-3.5 ml-1" />
            دانلود JSONL
          </Button>
        </div>

        <div className="rounded-lg border p-3 space-y-2 text-sm">
          <p className="font-medium flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            MLX (intake-mlx :8100)
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void refreshMlxHealth()}>
              وضعیت مدل
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void startMlxTrain()}>
              شروع train LoRA
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => void pollTrainStatus()}>
              وضعیت train
            </Button>
          </div>
          {mlxHealth && (
            <p className="text-xs text-muted-foreground font-mono">
              health: {mlxHealth.ok ? 'ok' : 'down'} · LLM_ENABLED=
              {String(mlxHealth.llmEnabled)} · {mlxHealth.modelId ?? '—'}
              {mlxHealth.loadError ? ` · ${mlxHealth.loadError}` : ''}
            </p>
          )}
          {intakeMeta?.engine && (
            <p className="text-xs">آخرین engine parse: {intakeMeta.engine}</p>
          )}
          {trainStatus && (
            <pre className="text-xs p-2 bg-muted rounded max-h-32 overflow-auto">
              {JSON.stringify(trainStatus, null, 2)}
            </pre>
          )}
        </div>

        {evalReport && (
          <div className="text-sm space-y-2">
            <p>
              دقت:{' '}
              <Badge variant={evalReport.accuracy >= 0.9 ? 'default' : 'destructive'}>
                {(evalReport.accuracy * 100).toFixed(1)}%
              </Badge>{' '}
              ({evalReport.passed}/{evalReport.total})
            </p>
            <ul className="max-h-40 overflow-y-auto text-xs space-y-1 font-mono">
              {evalReport.results
                .filter((r) => !r.pass)
                .map((r) => (
                  <li key={r.id} className="text-destructive">
                    {r.id}: {r.errors.join('; ')}
                  </li>
                ))}
              {evalReport.results.every((r) => r.pass) && (
                <li className="text-green-700 dark:text-green-400">همه کیس‌ها pass</li>
              )}
            </ul>
          </div>
        )}

        {lastParsed && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">آخرین parse زنده</summary>
            <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto max-h-48">
              {JSON.stringify(
                {
                  parsed: lastParsed,
                  meta: intakeMeta,
                },
                null,
                2
              )}
            </pre>
          </details>
        )}

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">تست متن دلخواه</p>
          <Textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="متن را بچسبانید و Parse بزنید"
            rows={2}
            className="text-sm"
          />
          <Button type="button" size="sm" variant="outline" onClick={() => void parseCustom()}>
            Parse
          </Button>
          {customResult && (
            <pre className="text-xs p-2 bg-muted rounded overflow-x-auto max-h-40">
              {JSON.stringify(customResult, null, 2)}
            </pre>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

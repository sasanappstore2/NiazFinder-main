'use client';

import { useCallback, useEffect, useState } from 'react';

export type LocalLlmHealthState = {
  online: boolean;
  mode: 'ai' | 'rules' | 'rules_fallback' | 'unknown';
  labelFa: string;
  parallelSlots?: number;
  model?: string;
  loadError?: string | null;
  loading: boolean;
};

const DEFAULT_STATE: LocalLlmHealthState = {
  online: false,
  mode: 'unknown',
  labelFa: 'در حال بررسی وضعیت AI…',
  loading: true,
};

export function useLocalLlmHealth(pollMs = 15_000): LocalLlmHealthState & { refresh: () => void } {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<LocalLlmHealthState>({
    ...DEFAULT_STATE,
    loading: true,
  });

  const refresh = useCallback(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/intake/llm-health', {
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
          if (!cancelled) {
            setState({
              online: false,
              mode: 'rules_fallback',
              labelFa: 'قوانین جایگزین؛ مدل آفلاین',
              loading: false,
              loadError: `HTTP ${res.status}`,
            });
          }
          return;
        }
        const data = (await res.json()) as {
          online?: boolean;
          mode?: LocalLlmHealthState['mode'];
          labelFa?: string;
          parallelSlots?: number;
          model?: string;
          loadError?: string | null;
        };
        if (!cancelled) {
          setState({
            online: Boolean(data.online),
            mode: data.mode ?? (data.online ? 'ai' : 'rules_fallback'),
            labelFa: data.labelFa ?? (data.online ? 'AI فعال' : 'قوانین جایگزین؛ مدل آفلاین'),
            parallelSlots: data.parallelSlots,
            model: data.model,
            loadError: data.loadError ?? null,
            loading: false,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            online: false,
            mode: 'rules_fallback',
            labelFa: 'قوانین جایگزین؛ مدل آفلاین',
            loading: false,
            loadError: e instanceof Error ? e.message : 'unreachable',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const cancel = refresh();
    const id = window.setInterval(() => {
      refresh();
    }, pollMs);
    return () => {
      cancel?.();
      window.clearInterval(id);
    };
  }, [pollMs, refresh, mounted]);

  if (!mounted) {
    return {
      online: false,
      mode: 'unknown',
      labelFa: '',
      loading: true,
      refresh,
    };
  }

  return { ...state, refresh };
}

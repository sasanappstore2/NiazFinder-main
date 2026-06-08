'use client';

import { useEffect, useRef, useState } from 'react';
import type { NeedDraft } from '@/contracts/need-intake';
import type { ListingCopyStreamEvent } from '@/lib/need-intake/listing-copy-stream-types';
import { buildLiveListingCopyHint } from '@/lib/need-intake/baseline-listing-copy';
import { pickListingTitleWithDealGuard } from '@/lib/need-intake/listing-copy-guards';

export interface LiveListingCopy {
  title: string;
  description: string;
  streaming: boolean;
}

/**
 * Debounced live title/description hint while user completes location/details steps.
 * Uses rules baseline instantly; optional full stream when draft is publish-ready.
 */
export function useListingCopyStream(
  draft: NeedDraft | null,
  enabled: boolean,
  debounceMs = 900
): LiveListingCopy | null {
  const [live, setLive] = useState<LiveListingCopy | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || !draft?.sourceText?.trim()) {
      setLive(null);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const hint = buildLiveListingCopyHint(draft);
      setLive({ ...hint, streaming: true });

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      void (async () => {
        try {
          const res = await fetch('/api/need-intake/preview-listing/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ draft }),
            signal: controller.signal,
          });
          if (!res.ok || !res.body) return;

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let title = hint.title;
          let description = hint.description;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const payload = line.slice(6).trim();
              if (payload === '[DONE]') continue;
              let event: ListingCopyStreamEvent;
              try {
                event = JSON.parse(payload) as ListingCopyStreamEvent;
              } catch {
                continue;
              }
              if (event.type === 'baseline') {
                title = event.title;
                description = event.description;
              } else if (event.type === 'title') {
                title = pickListingTitleWithDealGuard(
                  hint.title,
                  event.title,
                  draft.sourceText
                );
              } else if (event.type === 'description_delta') {
                description += event.text;
              } else if (event.type === 'done') {
                title = pickListingTitleWithDealGuard(
                  hint.title,
                  event.title,
                  draft.sourceText
                );
                description = event.description;
              }
              setLive({ title, description, streaming: event.type !== 'done' });
            }
          }
          setLive((prev) => (prev ? { ...prev, streaming: false } : null));
        } catch {
          if (!controller.signal.aborted) {
            setLive((prev) => (prev ? { ...prev, streaming: false } : null));
          }
        }
      })();
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [draft, enabled, debounceMs]);

  return live;
}

export async function consumeListingCopyStream(
  draft: NeedDraft,
  handlers: {
    onBaseline?: (title: string, description: string) => void;
    onTitle?: (title: string, source: 'template' | 'qwen') => void;
    onDescriptionDelta?: (text: string) => void;
    onDone?: (payload: {
      title: string;
      description: string;
      titleSource: 'template' | 'qwen';
      descriptionSource: 'template' | 'qwen';
    }) => void;
    onError?: (message: string) => void;
  },
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch('/api/need-intake/preview-listing/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draft }),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error('خطا در ساخت پیش‌نمایش');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') return;
      const event = JSON.parse(payload) as ListingCopyStreamEvent;
      switch (event.type) {
        case 'baseline':
          handlers.onBaseline?.(event.title, event.description);
          break;
        case 'title':
          handlers.onTitle?.(event.title, event.titleSource);
          break;
        case 'description_delta':
          handlers.onDescriptionDelta?.(event.text);
          break;
        case 'done':
          handlers.onDone?.({
            title: event.title,
            description: event.description,
            titleSource: event.titleSource,
            descriptionSource: event.descriptionSource,
          });
          break;
        case 'error':
          handlers.onError?.(event.message);
          break;
        default:
          break;
      }
    }
  }
}

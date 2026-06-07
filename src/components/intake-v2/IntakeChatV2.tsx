'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eraser, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessageList } from '@/components/intake-v2/ChatMessageList';
import { ChatComposer } from '@/components/intake-v2/ChatComposer';
import { ExtractedSlotsPanel } from '@/components/intake-v2/ExtractedSlotsPanel';
import { IntakePreviewCard } from '@/components/intake-v2/IntakePreviewCard';
import { PublishSuccessCard } from '@/components/intake-v2/PublishSuccessCard';
import { SuggestionChips } from '@/components/need-intake/SuggestionChips';
import { useIntakeV2Store } from '@/stores/intake-v2-store';
import { sendIntakeChatTurn } from '@/lib/intake-v2/intake-v2-client';
import { validateNeedDraftForPublish } from '@/intake/validation/publishValidator';
import { previewListingApi, publishNeedApi } from '@/lib/need-intake/intake-client';
import {
  getClientAuthToken,
} from '@/lib/auth/client-auth';
import { useAppStore } from '@/lib/store';
import { trackAnalyticsEvent } from '@/lib/analytics/track';
import { routeBuilder } from '@/config/routes';
import { cn } from '@/lib/utils';
import { chipValueToUserMessage } from '@/lib/intake-v2/chip-display-label';

const NON_SKIPPABLE = new Set([
  'dealType',
  'propertyKind',
  'location',
  'areaMin',
  'budget',
  'deposit',
  'monthlyRent',
  'floorMin',
]);

export function IntakeChatV2() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [animateTurnIndex, setAnimateTurnIndex] = useState<number | null>(null);

  const turns = useIntakeV2Store((s) => s.turns);
  const needDraft = useIntakeV2Store((s) => s.needDraft);
  const readinessScore = useIntakeV2Store((s) => s.readinessScore);
  const readyToPreview = useIntakeV2Store((s) => s.readyToPreview);
  const canSoftPreview = useIntakeV2Store((s) => s.canSoftPreview);
  const extractedSummary = useIntakeV2Store((s) => s.extractedSummary);
  const suggestedChips = useIntakeV2Store((s) => s.suggestedChips);
  const confirmedFields = useIntakeV2Store((s) => s.confirmedFields);
  const missingFields = useIntakeV2Store((s) => s.missingFields);
  const inferredFields = useIntakeV2Store((s) => s.inferredFields);
  const confirmedCount = useIntakeV2Store((s) => s.confirmedCount);
  const requiredCount = useIntakeV2Store((s) => s.requiredCount);
  const activeFieldKey = useIntakeV2Store((s) => s.activeFieldKey);
  const activeFieldLabel = useIntakeV2Store((s) => s.activeFieldLabel);
  const listingPreview = useIntakeV2Store((s) => s.listingPreview);
  const phase = useIntakeV2Store((s) => s.phase);
  const isLoading = useIntakeV2Store((s) => s.isLoading);
  const publishedNeed = useIntakeV2Store((s) => s.publishedNeed);

  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);

  const setPhase = useIntakeV2Store((s) => s.setPhase);
  const setListingPreview = useIntakeV2Store((s) => s.setListingPreview);
  const setLoading = useIntakeV2Store((s) => s.setLoading);
  const setError = useIntakeV2Store((s) => s.setError);
  const applyTurnResult = useIntakeV2Store((s) => s.applyTurnResult);
  const appendUserTurn = useIntakeV2Store((s) => s.appendUserTurn);
  const setPublishedNeed = useIntakeV2Store((s) => s.setPublishedNeed);
  const reset = useIntakeV2Store((s) => s.reset);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, listingPreview, publishedNeed, phase]);

  const sendMessage = useCallback(
    async (
      text: string,
      opts?: { chipFieldKey?: string; chipValue?: string }
    ) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setError(null);
      appendUserTurn(trimmed);
      setLoading(true);

      try {
        const result = await sendIntakeChatTurn(turns, needDraft, trimmed, {
          confirmedFields,
          chipFieldKey: opts?.chipFieldKey,
          chipValue: opts?.chipValue,
          lastAskedField: activeFieldKey,
        });
        applyTurnResult(result);
        const assistantIdx = (result.needDraft.turns?.length ?? 1) - 1;
        if (assistantIdx >= 0) setAnimateTurnIndex(assistantIdx);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'خطا در ارسال پیام';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [
      isLoading,
      turns,
      needDraft,
      confirmedFields,
      activeFieldKey,
      appendUserTurn,
      applyTurnResult,
      setError,
      setLoading,
    ]
  );

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput('');
    await sendMessage(trimmed);
  }, [input, sendMessage]);

  const handleBuildPreview = useCallback(async () => {
    if (!readyToPreview && !canSoftPreview) {
      toast.error('هنوز جزئیات کافی جمع نشده');
      return;
    }
    const publishCheck = validateNeedDraftForPublish(needDraft);
    if (readyToPreview && !publishCheck.success) {
      toast.error(publishCheck.errors.map((e) => e.message).join(' · '));
      return;
    }
    if (canSoftPreview && !publishCheck.success) {
      toast.message('پیش‌نمایش ناقص', {
        description: publishCheck.errors.map((e) => e.message).join(' · '),
      });
    }
    setIsPreviewLoading(true);
    setError(null);
    try {
      const data = await previewListingApi(needDraft, listingPreview?.extras);
      setListingPreview({
        title: data.title,
        description: data.description,
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
        extras: data.suggestedExtras,
        titleSource: data.titleSource,
      });
      setPhase('preview');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در ساخت پیش‌نمایش';
      toast.error(msg);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [
    readyToPreview,
    canSoftPreview,
    needDraft,
    listingPreview?.extras,
    setListingPreview,
    setPhase,
    setError,
  ]);

  const chips = suggestedChips.length > 0 ? suggestedChips : [];

  const handleChipSelect = useCallback(
    async (value: string) => {
      if (value === 'preview') {
        await handleBuildPreview();
        return;
      }
      if (value === '__skip__') {
        const field = activeFieldKey;
        if (!field || NON_SKIPPABLE.has(field)) {
          toast.error('این مورد برای تکمیل آگهی لازم است');
          return;
        }
        await sendMessage('بعداً', {
          chipFieldKey: field,
          chipValue: '__skip__',
        });
        return;
      }
      const selected = chips.find((c) => c.value === value);
      const messageText = chipValueToUserMessage(value, {
        label: selected?.label,
        fieldKey: activeFieldKey,
      });
      await sendMessage(messageText, {
        chipFieldKey: activeFieldKey ?? undefined,
        chipValue: value,
      });
    },
    [handleBuildPreview, sendMessage, activeFieldKey, chips]
  );

  const handlePublish = async () => {
    if (!listingPreview) return;
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      toast.info('برای انتشار آگهی، با شماره موبایل وارد شوید');
      return;
    }

    const publishCheck = validateNeedDraftForPublish(needDraft);
    if (!publishCheck.success) {
      toast.error(publishCheck.errors.map((e) => e.message).join(' · '));
      return;
    }

    setIsPublishing(true);
    setError(null);
    try {
      const token = getClientAuthToken();
      const data = await publishNeedApi(needDraft, token, listingPreview);
      setPublishedNeed({ id: data.id, title: data.title });
      trackAnalyticsEvent('need_created', {
        requestId: data.id,
        title: data.title,
        source: 'v2',
      });
      toast.success(data.message ?? 'آگهی منتشر شد');
      window.setTimeout(() => {
        router.push(routeBuilder.listing(data.id, data.title));
      }, 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در انتشار';
      toast.error(msg);
      setPhase('preview');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReset = () => {
    reset();
    setInput('');
  };

  const handleFeedback = useCallback(
    async (turnIndex: number) => {
      try {
        await fetch('/api/v2/intake-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            turns,
            needDraft,
            reason: `wrong reply at turn ${turnIndex}`,
          }),
        });
        toast.success('بازخورد ثبت شد — برای بهبود مدل استفاده می‌شود.');
        trackAnalyticsEvent('v2_intake_feedback', { turnIndex });
      } catch {
        toast.error('ثبت بازخورد ناموفق بود.');
      }
    },
    [turns, needDraft]
  );

  const needsAuthForPublish = phase === 'preview' && listingPreview != null && !isAuthenticated;

  const panelProps = {
    needDraft,
    readinessScore,
    readyToPreview,
    extractedSummary,
    missingFields,
    inferredFields,
    confirmedCount,
    requiredCount,
    activeFieldKey,
    activeFieldLabel,
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="size-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">ثبت نیاز با چت</h1>
              <p className="truncate text-xs text-muted-foreground">
                نسخه آزمایشی — فقط املاک
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              v2 آزمایشی
            </Badge>
            <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
              <Eraser className="size-4" />
            </Button>
          </div>
        </header>

        <ExtractedSlotsPanel {...panelProps} variant="mobile" />

        <ScrollArea className="min-h-0 flex-1">
          <ChatMessageList
            turns={turns}
            isLoading={isLoading}
            animateTurnIndex={animateTurnIndex}
            onFeedback={handleFeedback}
          />
          {phase === 'preview' && listingPreview ? (
            <IntakePreviewCard
              preview={listingPreview}
              onPublish={handlePublish}
              onEdit={() => setPhase('chat')}
              isPublishing={isPublishing}
              needsAuth={needsAuthForPublish}
            />
          ) : null}
          {publishedNeed ? (
            <PublishSuccessCard
              needId={publishedNeed.id}
              title={publishedNeed.title}
              onNewChat={handleReset}
            />
          ) : null}
          <div ref={scrollRef} />
        </ScrollArea>

        {chips.length > 0 && phase === 'chat' && !isLoading ? (
          <div className="border-t px-4 py-2">
            {activeFieldLabel ? (
              <p className="mb-1.5 text-[11px] text-muted-foreground">
                پیشنهاد برای: {activeFieldLabel}
              </p>
            ) : null}
            <SuggestionChips
              options={chips}
              onSelect={(v) => handleChipSelect(Array.isArray(v) ? v[0] : v)}
              disabled={isLoading || isPreviewLoading}
            />
          </div>
        ) : null}

        <ChatComposer
          value={input}
          onChange={setInput}
          onSubmit={handleSend}
          isLoading={isLoading || isPreviewLoading}
          disabled={phase === 'done'}
          className={cn(phase === 'done' && 'opacity-50 pointer-events-none')}
        />
      </div>

      <ExtractedSlotsPanel {...panelProps} variant="desktop" />
    </div>
  );
}

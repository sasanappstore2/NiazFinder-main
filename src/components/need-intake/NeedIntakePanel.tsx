'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useNeedIntakeStore } from '@/stores/need-intake-store';
import { useAppStore } from '@/lib/store';
import { ChatBubble } from './ChatBubble';
import { SuggestionChips } from './SuggestionChips';
import { QuestionCard } from './QuestionCard';
import { ProgressIndicator } from './ProgressIndicator';
import { AIThinkingLoader } from './AIThinkingLoader';
import { buildSummary } from '@/lib/need-intake/question-engine';
import { seedAnswersFromParsed } from '@/lib/need-intake/seed-answers';
import { getClarifyingChipSet } from '@/lib/need-intake/clarifying-chips';
import {
  chatTurnApi,
  extractSlotsApi,
  nextQuestionApi,
  parseIntentApi,
  previewListingApi,
  publishNeedApi,
} from '@/lib/need-intake/intake-client';
import { isCoreIntakeComplete } from '@/lib/need-intake/core-progress';
import { NeedSummarySidebar } from './NeedSummarySidebar';
import { IntakeChatComposer } from './IntakeChatComposer';
import { NeedListingPreview } from './NeedListingPreview';
import { routeBuilder } from '@/config/routes';
import type { NextQuestionResponse, ParsedIntent } from '@/contracts/need-intake';
import {
  buildPrefilledIntent,
  resolveSlugFromQuery,
} from '@/lib/need-intake/prefill-from-query';
import { normalizeCategoryPair } from '@/config/categories';
import { getLeadPhone, setLeadPhone } from '@/lib/lead-draft';

const TOKEN_KEY = 'needfinder_auth_token';

interface NeedIntakePanelProps {
  initialSeed?: string;
  initialCategory?: string | null;
  initialCity?: string | null;
  initialPhone?: string | null;
}

export function NeedIntakePanel({
  initialSeed = '',
  initialCategory = null,
  initialCity = null,
  initialPhone = null,
}: NeedIntakePanelProps) {
  const router = useRouter();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const setAuthModalTab = useAppStore((s) => s.setAuthModalTab);

  const {
    step,
    parsedIntent,
    answers,
    turns,
    currentQuestion,
    summary,
    error,
    isLoading,
    setSeedText,
    addTurn,
    setAnswer,
    setAnswers,
    setStep,
    setParsedIntent,
    setCurrentQuestion,
    setSummary,
    listingPreview,
    setListingPreview,
    readinessScore,
    readyToPreview,
    setReadiness,
    leadPhone,
    setLeadPhone,
    setError,
    setLoading,
    reset,
    getDraft,
  } = useNeedIntakeStore();

  const [draftInput, setDraftInput] = useState(initialSeed);
  const [chatInput, setChatInput] = useState('');
  const [isRepublishing, setIsRepublishing] = useState(false);
  const [fieldValue, setFieldValue] = useState<string | number>('');
  const [aiMeta, setAiMeta] = useState<{
    source?: string;
    aiEnabled?: boolean;
    cacheHit?: boolean;
    latencyMs?: number;
  } | null>(null);
  const [liveSummary, setLiveSummary] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialSeed) setDraftInput(initialSeed);
  }, [initialSeed]);

  useEffect(() => {
    const phone = initialPhone?.trim() || getLeadPhone();
    if (phone) setLeadPhone(phone);
  }, [initialPhone, setLeadPhone]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, step, isLoading, currentQuestion]);

  useEffect(() => {
    if (!parsedIntent) {
      setLiveSummary('');
      return;
    }
    if (
      step === 'questioning' ||
      step === 'clarifying' ||
      step === 'chatting' ||
      step === 'preview' ||
      step === 'summary'
    ) {
      setLiveSummary(buildSummary(parsedIntent, answers));
    }
  }, [parsedIntent, answers, step]);

  const enterChattingPhase = useCallback(
    (intent: ParsedIntent, answerMap: Record<string, unknown>) => {
      setSummary(buildSummary(intent, answerMap));
      setStep('chatting');
      setReadiness(isCoreIntakeComplete(intent, answerMap) ? 0.7 : 0.4, false);
      addTurn({
        role: 'assistant',
        content:
          'سؤالات اولیه تمام شد. هر جزئیات دیگری (بودجه، زمان، محدوده کار) را بنویسید؛ وقتی کافی بود پیش‌نمایش آگهی را می‌سازیم.',
      });
    },
    [addTurn, setSummary, setStep, setReadiness]
  );

  const applyNextQuestion = useCallback(
    (intent: ParsedIntent, answerMap: Record<string, unknown>, data: NextQuestionResponse) => {
      setCurrentQuestion(data);
      if (data.done && isCoreIntakeComplete(intent, answerMap)) {
        enterChattingPhase(intent, answerMap);
      } else if (!data.done) {
        setStep('questioning');
        setFieldValue('');
      }
    },
    [enterChattingPhase, setCurrentQuestion, setStep]
  );

  const loadNextQuestion = useCallback(
    async (intent: ParsedIntent, answerMap: Record<string, unknown>) => {
      const data = await nextQuestionApi(intent, answerMap);
      applyNextQuestion(intent, answerMap, data);
      return data;
    },
    [applyNextQuestion]
  );

  const startParse = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      setLoading(true);
      setError(null);
      setStep('parsing');
      setSeedText(trimmed);
      addTurn({ role: 'user', content: trimmed });

      try {
        const data = await parseIntentApi(trimmed);
        let intent = data.parsed;
        if (initialCategory) {
          const slug = resolveSlugFromQuery(initialCategory);
          if (slug) {
            const pair = normalizeCategoryPair(slug);
            intent = {
              ...intent,
              categorySlug: pair.categorySlug,
              subcategorySlug: pair.subcategorySlug,
              confidence: Math.max(intent.confidence, 0.85),
            };
          }
        }
        if (initialCity && !intent.city) {
          const prefilled = buildPrefilledIntent(null, initialCity);
          if (prefilled?.city) intent = { ...intent, city: prefilled.city };
        }

        setParsedIntent(intent);
        const phone = initialPhone?.trim() || getLeadPhone();
        const seeded = seedAnswersFromParsed(intent, phone);
        setAnswers(seeded);
        if (phone) setLeadPhone(phone);
        setAiMeta(data.meta ?? null);
        setLiveSummary(buildSummary(intent, seeded));
        addTurn({ role: 'assistant', content: data.assistantMessage });

        if (intent.confidence >= 0.65) {
          await loadNextQuestion(intent, seeded);
        } else {
          setStep('clarifying');
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'خطا';
        setError(msg);
        setStep('idle');
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [addTurn, setParsedIntent, setAnswers, setStep, setLoading, setError, setSeedText, loadNextQuestion]
  );

  useEffect(() => {
    reset();
    setDraftInput(initialSeed);
    setAiMeta(null);

    const prefilled = buildPrefilledIntent(initialCategory, initialCity, initialSeed);

    if (initialSeed.trim()) {
      void startParse(initialSeed);
    } else if (prefilled) {
      setParsedIntent(prefilled);
      const phone = initialPhone?.trim() || getLeadPhone();
      const seeded = seedAnswersFromParsed(prefilled, phone);
      setAnswers(seeded);
      if (phone) setLeadPhone(phone);
      setLiveSummary(buildSummary(prefilled, seeded));
      setStep('questioning');
      void loadNextQuestion(prefilled, seeded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one session per mount
  }, []);

  const handleSeedSubmit = () => {
    const text = draftInput.trim();
    if (!text) return;
    reset();
    setDraftInput(text);
    void startParse(text);
  };

  const confirmIntent = async () => {
    if (!parsedIntent) return;
    setLoading(true);
    setError(null);
    try {
      await loadNextQuestion(parsedIntent, answers);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (overrideValue?: string | number) => {
    if (!currentQuestion?.field || !parsedIntent) return;

    const key = currentQuestion.field.key;
    const val = overrideValue !== undefined ? overrideValue : fieldValue;
    if (val === '' || val === undefined) {
      toast.info('لطفاً پاسخ را وارد کنید');
      return;
    }

    let nextAnswers = { ...answers, [key]: val };
    setAnswer(key, val as string | number | boolean);
    setFieldValue('');

    setLoading(true);
    setError(null);
    try {
      if (aiMeta?.aiEnabled) {
        try {
          const { slots } = await extractSlotsApi(parsedIntent, nextAnswers, {
            fieldKey: key,
            value: val,
          });
          if (Object.keys(slots).length > 0) {
            nextAnswers = {
              ...nextAnswers,
              ...(slots as Record<string, string | number | boolean>),
            };
            setAnswers(nextAnswers);
          }
        } catch {
          /* slot extraction is best-effort */
        }
      }
      await loadNextQuestion(parsedIntent, nextAnswers);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const goToPreview = useCallback(async () => {
    const draft = getDraft();
    if (!draft) return;
    setLoading(true);
    setError(null);
    try {
      const data = await previewListingApi(draft, listingPreview?.extras);
      setListingPreview({
        title: data.title,
        description: data.description,
        extras: data.suggestedExtras ?? listingPreview?.extras,
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
      });
      setStep('preview');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [getDraft, listingPreview?.extras, setListingPreview, setStep, setLoading, setError]);

  const handleChatSend = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || !parsedIntent) return;

    setChatInput('');
    addTurn({ role: 'user', content: text });
    setLoading(true);
    setError(null);

    try {
      const draft = getDraft();
      if (!draft) return;

      const result = await chatTurnApi(draft, text);
      let nextAnswers = { ...answers };
      if (result.slotUpdates && Object.keys(result.slotUpdates).length > 0) {
        nextAnswers = {
          ...nextAnswers,
          ...(result.slotUpdates as Record<string, string | number | boolean>),
        };
        setAnswers(nextAnswers);
      }
      if (result.mergedIntent) {
        setParsedIntent(result.mergedIntent);
      }
      addTurn({ role: 'assistant', content: result.assistantMessage });
      setReadiness(result.readinessScore, result.readyToPreview);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [
    chatInput,
    parsedIntent,
    answers,
    addTurn,
    getDraft,
    setAnswers,
    setParsedIntent,
    setReadiness,
    setLoading,
    setError,
  ]);

  const handleRepolish = useCallback(async () => {
    const draft = getDraft();
    if (!draft || !listingPreview) return;
    setIsRepublishing(true);
    try {
      const data = await previewListingApi(draft, listingPreview.extras);
      setListingPreview({
        ...listingPreview,
        title: data.title,
        description: data.description,
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
      });
      toast.success('آگهی دوباره پالیش شد');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setIsRepublishing(false);
    }
  }, [getDraft, listingPreview, setListingPreview]);

  const publish = async () => {
    if (!isAuthenticated) {
      setAuthModalTab('login');
      setAuthModalOpen(true);
      const savedPhone = getLeadPhone();
      toast.info(
        savedPhone
          ? `برای ثبت نیاز وارد شوید — شماره ${savedPhone} ذخیره شده است`
          : 'برای ثبت نیاز ابتدا وارد شوید'
      );
      return;
    }

    const draft = getDraft();
    if (!draft) {
      toast.error('پیش‌نویس نامعتبر است. لطفاً دوباره شروع کنید.');
      return;
    }

    if (!listingPreview) {
      toast.error('ابتدا پیش‌نمایش آگهی را بسازید');
      return;
    }

    setStep('publishing');
    setLoading(true);
    setError(null);
    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
      const data = await publishNeedApi(draft, token, listingPreview);
      toast.success('نیاز شما ثبت شد!');
      setStep('done');
      router.push(routeBuilder.listing(data.id, data.title));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'خطا در ثبت';
      setError(msg);
      toast.error(msg);
      if (msg.includes('وارد')) {
        setAuthModalTab('login');
        setAuthModalOpen(true);
      }
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const showSeedForm =
    (step === 'idle' || (step === 'parsing' && !isLoading && Boolean(error))) &&
    !isLoading;

  const clarifyingChips =
    parsedIntent && step === 'clarifying'
      ? getClarifyingChipSet(parsedIntent, answers)
      : null;

  return (
    <div className="flex min-h-[70vh] gap-6">
      <div className="flex min-h-[70vh] flex-1 flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1 text-caption">
          <Sparkles className="size-3" />
          {aiMeta?.aiEnabled
            ? `هوش مصنوعی (${aiMeta.source === 'hybrid' || aiMeta.source === 'llm' ? 'LM Studio' : 'فعال'}${aiMeta.cacheHit ? ' · کش' : ''}${aiMeta.latencyMs ? ` · ${Math.round(aiMeta.latencyMs / 1000)}ث` : ''})`
            : 'تحلیل هوشمند (حالت آفلاین)'}
        </Badge>
        {step === 'questioning' && currentQuestion && !currentQuestion.done && (
          <ProgressIndicator
            current={currentQuestion.progress.current}
            total={currentQuestion.progress.total}
          />
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {showSeedForm && (
          <div className="space-y-4 rounded-2xl border bg-card/50 p-4">
            <p className="text-muted-foreground text-sm">
              نیازتان را با زبان ساده بنویسید. سیستم دسته‌بندی و سؤالات بعدی را پیشنهاد
              می‌دهد.
            </p>
            <Textarea
              value={draftInput}
              onChange={(e) => setDraftInput(e.target.value)}
              placeholder="مثلاً: تعمیرکار کولر فوری غرب تهران"
              className="min-h-[120px] text-lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSeedSubmit();
                }
              }}
            />
            <Button
              className="w-full h-12"
              onClick={handleSeedSubmit}
              disabled={!draftInput.trim() || isLoading}
            >
              <Send className="size-4 ml-2" />
              شروع
            </Button>
          </div>
        )}

        {turns.map((t, i) => (
          <ChatBubble key={i} role={t.role}>
            {t.content}
          </ChatBubble>
        ))}

        {isLoading && <AIThinkingLoader label={step === 'publishing' ? 'در حال ثبت…' : undefined} />}

        {step === 'clarifying' && parsedIntent && !isLoading && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              لطفاً نوع نیازتان را تأیید کنید:
            </p>
            {clarifyingChips && (
              <>
                <p className="text-xs text-muted-foreground">{clarifyingChips.label}</p>
                <SuggestionChips
                  options={clarifyingChips.options}
                  onSelect={(v) => {
                    const next = { ...answers, [clarifyingChips.fieldKey]: v };
                    setAnswers(next);
                    void loadNextQuestion(parsedIntent, next);
                  }}
                />
              </>
            )}
            <SuggestionChips
              options={[
                { value: 'confirm', label: 'بله، ادامه بده' },
                { value: 'retry', label: 'از اول می‌نویسم' },
              ]}
              onSelect={(v) => {
                if (v === 'confirm') void confirmIntent();
                else {
                  reset();
                  setDraftInput('');
                  setStep('idle');
                }
              }}
            />
          </div>
        )}

        {step === 'questioning' && !isLoading && currentQuestion && !currentQuestion.done && (
          <QuestionCard
            question={currentQuestion.question ?? ''}
            field={currentQuestion.field}
            value={fieldValue}
            onChange={setFieldValue}
            onSubmit={() => void submitAnswer()}
            onChipSelect={(v) => void submitAnswer(v)}
            disabled={isLoading}
          />
        )}

        {step === 'questioning' && !isLoading && !currentQuestion && parsedIntent && (
          <div className="rounded-xl border border-dashed p-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">در حال آماده‌سازی سؤالات…</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadNextQuestion(parsedIntent, answers)}
            >
              تلاش مجدد
            </Button>
          </div>
        )}

        {step === 'chatting' && !isLoading && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              با دستیار گفتگو کنید تا جزئیات تکمیل شود.
              {readinessScore > 0 && (
                <span className="mr-1 text-primary">
                  ({Math.round(readinessScore * 100)}٪ آماده)
                </span>
              )}
            </p>
            {(readyToPreview || readinessScore >= 0.85) && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => void goToPreview()}
                disabled={isLoading}
              >
                ساخت پیش‌نمایش آگهی
              </Button>
            )}
          </div>
        )}

        {step === 'preview' && listingPreview && (
          <NeedListingPreview
            preview={listingPreview}
            onChange={setListingPreview}
            onRepolish={() => void handleRepolish()}
            onPublish={() => void publish()}
            isLoading={isLoading}
            isRepublishing={isRepublishing}
          />
        )}

        {error && (
          <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">
            {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {step === 'chatting' && (
        <div className="sticky bottom-0 border-t bg-background/95 pt-3 backdrop-blur-sm">
          <IntakeChatComposer
            value={chatInput}
            onChange={setChatInput}
            onSubmit={() => void handleChatSend()}
            disabled={isLoading}
          />
        </div>
      )}

      {(step === 'parsing' ||
        step === 'clarifying' ||
        step === 'questioning' ||
        step === 'chatting' ||
        step === 'summary') && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 self-start"
          onClick={() => {
            reset();
            setDraftInput('');
            setStep('idle');
            setLiveSummary('');
          }}
        >
          <ArrowRight className="size-4 ml-1" />
          شروع دوباره
        </Button>
      )}
      </div>

      <NeedSummarySidebar
        summary={liveSummary}
        parsed={parsedIntent}
        visible={
          Boolean(liveSummary) &&
          (step === 'questioning' ||
            step === 'clarifying' ||
            step === 'chatting' ||
            step === 'preview' ||
            step === 'summary')
        }
      />
    </div>
  );
}

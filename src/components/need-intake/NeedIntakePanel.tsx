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
  extractSlotsApi,
  nextQuestionApi,
  parseIntentApi,
  publishNeedApi,
} from '@/lib/need-intake/intake-client';
import { NeedSummarySidebar } from './NeedSummarySidebar';
import { routeBuilder } from '@/config/routes';
import type { NextQuestionResponse, ParsedIntent } from '@/contracts/need-intake';

const TOKEN_KEY = 'needfinder_auth_token';

interface NeedIntakePanelProps {
  initialSeed?: string;
}

export function NeedIntakePanel({ initialSeed = '' }: NeedIntakePanelProps) {
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
    setError,
    setLoading,
    reset,
    getDraft,
  } = useNeedIntakeStore();

  const [draftInput, setDraftInput] = useState(initialSeed);
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, step, isLoading, currentQuestion]);

  useEffect(() => {
    if (!parsedIntent) {
      setLiveSummary('');
      return;
    }
    if (step === 'questioning' || step === 'clarifying' || step === 'summary') {
      setLiveSummary(buildSummary(parsedIntent, answers));
    }
  }, [parsedIntent, answers, step]);

  const applyNextQuestion = useCallback(
    (intent: ParsedIntent, answerMap: Record<string, unknown>, data: NextQuestionResponse) => {
      setCurrentQuestion(data);
      if (data.done) {
        setSummary(buildSummary(intent, answerMap));
        setStep('summary');
      } else {
        setStep('questioning');
        setFieldValue('');
      }
    },
    [setCurrentQuestion, setSummary, setStep]
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
        const intent = data.parsed;

        setParsedIntent(intent);
        const seeded = seedAnswersFromParsed(intent);
        setAnswers(seeded);
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

    if (initialSeed.trim()) {
      void startParse(initialSeed);
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
            nextAnswers = { ...nextAnswers, ...slots };
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

  const publish = async () => {
    if (!isAuthenticated) {
      setAuthModalTab('login');
      setAuthModalOpen(true);
      toast.info('برای ثبت نیاز ابتدا وارد شوید');
      return;
    }

    const draft = getDraft();
    if (!draft) {
      toast.error('پیش‌نویس نامعتبر است. لطفاً دوباره شروع کنید.');
      return;
    }

    setStep('publishing');
    setLoading(true);
    setError(null);
    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
      const data = await publishNeedApi(draft, token);
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
      setStep('summary');
    } finally {
      setLoading(false);
    }
  };

  const showSeedForm =
    (step === 'idle' || (step === 'parsing' && !isLoading && Boolean(error))) &&
    !isLoading;

  const inConversation =
    step === 'parsing' ||
    step === 'clarifying' ||
    step === 'questioning' ||
    step === 'summary' ||
    step === 'publishing';

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

        {step === 'summary' && (
          <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
            <h3 className="text-h3 font-semibold">خلاصه نیاز شما</h3>
            <p className="text-body-sm whitespace-pre-line text-muted-foreground leading-relaxed">
              {summary}
            </p>
            <Button className="w-full h-12" onClick={() => void publish()} disabled={isLoading}>
              تأیید و ثبت نیاز
            </Button>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">
            {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {inConversation && step !== 'summary' && step !== 'done' && (
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
          (step === 'questioning' || step === 'clarifying' || step === 'summary')
        }
      />
    </div>
  );
}

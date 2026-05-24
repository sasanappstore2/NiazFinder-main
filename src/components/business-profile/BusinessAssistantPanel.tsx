'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AssistantMessage, Business, OfferCtaType } from '@/contracts/business-profile';

interface Props {
  business: Business;
  className?: string;
}

const CTA_LABELS: Record<OfferCtaType, string> = {
  book: 'رزرو',
  quote: 'استعلام قیمت',
  call: 'تماس',
  chat: 'چت',
};

export function BusinessAssistantPanel({ business, className }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: 'assistant',
      content: `سلام! من دستیار ${business.name} هستم. چطور می‌توانم کمکتان کنم؟`,
    },
  ]);
  const [followUps, setFollowUps] = useState<string[]>(
    business.aiAssistantConfig.dynamicQuestions.slice(0, 3)
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages: AssistantMessage[] = [
      ...messages,
      { role: 'user', content: trimmed },
    ];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/api/business/${business.id}/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا');

      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
      if (data.followUpQuestions?.length) setFollowUps(data.followUpQuestions);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'متأسفانه خطایی رخ داد. لطفاً دوباره تلاش کنید یا با تماس مستقیم ادامه دهید.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        size="lg"
        className={cn(
          'fixed bottom-20 left-4 z-40 rounded-full shadow-lg gap-2 sm:bottom-6',
          className
        )}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="size-4" />
        دستیار هوشمند
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="بستن"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-[85vh] w-full max-w-md flex-col rounded-t-2xl sm:rounded-2xl border bg-background shadow-xl">
            <header className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="size-5 text-primary" />
                <span className="font-semibold text-sm">دستیار {business.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </Button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[90%] rounded-2xl px-3 py-2 text-sm',
                    m.role === 'user'
                      ? 'ms-auto bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="text-xs text-muted-foreground animate-pulse">در حال نوشتن…</div>
              )}
              <div ref={bottomRef} />
            </div>

            {followUps.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {followUps.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="rounded-full border px-2.5 py-1 text-xs hover:bg-accent"
                    onClick={() => send(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <form
              className="flex gap-2 border-t p-3"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="سؤال خود را بنویسید…"
                disabled={loading}
              />
              <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                <Send className="size-4" />
              </Button>
            </form>

            <p className="px-4 pb-3 text-caption text-muted-foreground text-center">
              پیشنهاد: {CTA_LABELS.book} · {CTA_LABELS.quote} · {CTA_LABELS.chat}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

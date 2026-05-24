'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Paperclip, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { routeBuilder } from '@/config/routes';
import { toast } from 'sonner';

const EXAMPLE_CHIPS = [
  'خانه دو خواب غرب تهران',
  'ps5 تا ۳۰ میلیون',
  'تعمیرکار کولر فوری',
  'می‌خوام ماشین کارکرده',
  'طراحی لوگو برای کسب‌وکار',
];

export function NeedHeroInput() {
  const router = useRouter();
  const [text, setText] = useState('');

  const go = (value: string) => {
    const v = value.trim();
    if (!v) return;
    router.push(`${routeBuilder.needIntake()}?seed=${encodeURIComponent(v)}`);
  };

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-b from-primary/5 via-card to-card p-6 sm:p-8 shadow-sm"
      aria-label="ثبت نیاز هوشمند"
    >
      <div className="mb-4 flex items-center gap-2 text-primary">
        <Sparkles className="size-5" />
        <span className="text-sm font-semibold">ثبت نیاز با هوش مصنوعی</span>
      </div>

      <h1 className="mb-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
        نیازتان را بگویید، ما کمک می‌کنیم
      </h1>
      <p className="mb-6 text-muted-foreground text-sm sm:text-base max-w-xl">
        مثل گفتگو با یک دوست — بدون فرم پیچیده. فقط بنویسید چه می‌خواهید.
      </p>

      <div className="rounded-2xl border bg-background p-2 shadow-inner">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="مثلاً: به تعمیرکار کولر در غرب تهران نیاز دارم…"
          className="min-h-[88px] resize-none border-0 text-base sm:text-lg shadow-none focus-visible:ring-0"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              go(text);
            }
          }}
        />
        <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2 px-1">
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10"
              title="به زودی"
              onClick={() => toast.info('ورود صوتی به زودی فعال می‌شود')}
            >
              <Mic className="size-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10"
              title="به زودی"
              onClick={() => toast.info('آپلود تصویر به زودی فعال می‌شود')}
            >
              <Paperclip className="size-5" />
            </Button>
          </div>
          <Button
            type="button"
            className="h-11 px-6 rounded-xl gap-2"
            onClick={() => go(text)}
            disabled={!text.trim()}
          >
            شروع
            <Send className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {EXAMPLE_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => go(chip)}
            className="min-h-10 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-xs sm:text-sm hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>
    </section>
  );
}

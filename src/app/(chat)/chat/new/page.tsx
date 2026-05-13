'use client';

import { ChatPanel } from '@/components/chat/ChatPanel';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NewConversationPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="rounded-full bg-emerald-100 p-4 dark:bg-emerald-900/40">
        <svg
          className="h-8 w-8 text-emerald-600 dark:text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
          />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          شروع گفتگوی جدید
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          از لیست درخواست‌ها یا پروفایل متخصصان گفتگوی جدید شروع کنید
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/requests">
          <Button variant="outline" className="gap-2">
            مرور درخواست‌ها
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/specialists">
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            جستجوی متخصصان
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

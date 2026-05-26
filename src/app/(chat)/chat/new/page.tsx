'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  startConversation,
  navigateToConversation,
  ContactAuthRequiredError,
} from '@/lib/contact/start-conversation';
import { savePendingContact } from '@/lib/contact/pending-contact';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { routeBuilder } from '@/config/routes';

function NewChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const requestId = searchParams.get('requestId') ?? undefined;
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const authToken = useAppStore((s) => s.authToken);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    if (!isAuthenticated || !authToken) {
      savePendingContact({
        action: 'chat',
        otherUserId: userId,
        requestId,
      });
      setAuthModalOpen(true);
      return;
    }

    let cancelled = false;
    void startConversation({ otherUserId: userId, requestId }, authToken)
      .then(({ conversationId }) => {
        if (!cancelled) navigateToConversation(router, conversationId);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ContactAuthRequiredError) {
          setAuthModalOpen(true);
        } else {
          setError(e instanceof Error ? e.message : 'خطا');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId, requestId, isAuthenticated, authToken, router, setAuthModalOpen]);

  if (userId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">در حال باز کردن گفتگو…</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div>
        <h2 className="text-lg font-semibold text-foreground">شروع گفتگوی جدید</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          از صفحه نیاز یا پروفایل کسب‌وکار، دکمه «چت» را بزنید
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href={routeBuilder.search({ location: 'iran' })}>
          <Button variant="outline">جستجوی کسب‌وکار</Button>
        </Link>
        <Link href={routeBuilder.needIntake()}>
          <Button className="bg-emerald-600 hover:bg-emerald-700">ثبت نیاز</Button>
        </Link>
      </div>
    </div>
  );
}

export default function NewConversationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center p-6">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <NewChatContent />
    </Suspense>
  );
}

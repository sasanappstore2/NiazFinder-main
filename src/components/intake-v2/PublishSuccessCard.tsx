'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playApplePaySuccessSound } from '@/lib/sounds/apple-pay-success';
import { routeBuilder } from '@/config/routes';

interface PublishSuccessCardProps {
  needId: string;
  title: string;
  onNewChat: () => void;
}

export function PublishSuccessCard({ needId, title, onNewChat }: PublishSuccessCardProps) {
  useEffect(() => {
    playApplePaySuccessSound();
  }, []);

  const needUrl = routeBuilder.listing(needId, title);

  return (
    <div className="mx-4 my-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/15">
          <Check className="size-5 text-emerald-600" strokeWidth={3} />
        </div>
        <div>
          <p className="font-semibold">آگهی منتشر شد</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" asChild>
          <Link href={needUrl}>
            <ExternalLink className="ms-1 size-3.5" />
            مشاهده آگهی
          </Link>
        </Button>
        <Button size="sm" variant="outline" onClick={onNewChat}>
          شروع مکالمه جدید
        </Button>
      </div>
    </div>
  );
}

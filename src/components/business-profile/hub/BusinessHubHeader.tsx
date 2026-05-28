'use client';

import Link from 'next/link';
import { Copy, ExternalLink, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBusinessHub } from './BusinessHubContext';

function toPersianDigits(num: number): string {
  return num.toLocaleString('fa-IR');
}

export function BusinessHubHeader() {
  const { profile } = useBusinessHub();
  if (!profile) return null;

  const initial = profile.name.trim().charAt(0) || 'ک';

  const copyLink = async () => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}${profile.publicUrl}`
        : profile.publicUrl;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('لینک صفحه شما کپی شد');
    } catch {
      toast.error('کپی لینک ممکن نشد');
    }
  };

  const shareLink = async () => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}${profile.publicUrl}`
        : profile.publicUrl;
    if (navigator.share) {
      try {
        await navigator.share({ title: profile.name, url });
        return;
      } catch {
        /* fall through */
      }
    }
    void copyLink();
  };

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-linear-to-br from-emerald-500/10 via-background to-background p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Avatar className="size-14 shrink-0 border-2 border-emerald-500/20">
            {profile.logo ? (
              <AvatarImage src={profile.logo} alt={profile.name} />
            ) : null}
            <AvatarFallback className="bg-emerald-500/10 text-lg font-bold text-emerald-800">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold sm:text-xl">{profile.name}</h1>
              {profile.verified && (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700">
                  تأیید شده
                </Badge>
              )}
            </div>
            <p className="truncate text-sm text-muted-foreground" dir="ltr">
              /b/{profile.slug}
            </p>
            <p className="text-xs text-muted-foreground">
              {toPersianDigits(profile.viewCount)} بازدید از صفحه شما
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void copyLink()}>
            <Copy className="size-3.5" />
            کپی لینک
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 sm:hidden" onClick={() => void shareLink()}>
            <Share2 className="size-3.5" />
            اشتراک
          </Button>
          <Button variant="default" size="sm" asChild className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <Link href={profile.publicUrl} target="_blank" rel="noopener noreferrer">
              مشاهده صفحه من
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

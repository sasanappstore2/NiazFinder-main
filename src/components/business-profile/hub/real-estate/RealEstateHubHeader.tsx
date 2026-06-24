'use client';

import Link from 'next/link';
import { Copy, ExternalLink, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBusinessHub } from '../BusinessHubContext';
import { toPersianDigits } from '@/lib/format/digits';

export function RealEstateHubHeader({ occupationLabel }: { occupationLabel: string }) {
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

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Avatar className="size-14 shrink-0 border-2 border-border">
            {profile.logo ? <AvatarImage src={profile.logo} alt={profile.name} /> : null}
            <AvatarFallback className="bg-muted text-lg font-bold text-foreground">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold sm:text-xl">{profile.name}</h1>
              <Badge variant="secondary">{occupationLabel}</Badge>
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
              {toPersianDigits(profile.viewCount)} بازدید · پنل مدیریت املاک
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void copyLink()}>
            <Copy className="size-3.5" />
            کپی لینک
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 sm:hidden"
            onClick={() => void copyLink()}
          >
            <Share2 className="size-3.5" />
            اشتراک
          </Button>
          <Button variant="default" size="sm" asChild className="gap-1.5">
            <Link href={profile.publicUrl} target="_blank" rel="noopener noreferrer">
              مشاهده صفحه عمومی
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

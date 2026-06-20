'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BadgeCheck, MapPin, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StarRating } from '@/components/shared/StarRating';
import type { PublicStarredBusiness } from '@/lib/business/starred-business';

interface ProfileStarredBusinessesProps {
  userId: string;
}

export function ProfileStarredBusinesses({ userId }: ProfileStarredBusinessesProps) {
  const [businesses, setBusinesses] = useState<PublicStarredBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const res = await fetch(`/api/users/${userId}/stars`, {
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { businesses?: PublicStarredBusiness[] };
        if (!cancelled) {
          setBusinesses(data.businesses ?? []);
        }
      } catch {
        if (!cancelled) setBusinesses([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
          <Star className="size-8 text-muted-foreground/40" />
        </div>
        <h3 className="mb-2 text-sm font-semibold">{'\u06a9\u0633\u0628\u200c\u0648\u06a9\u0627\u0631 \u0633\u062a\u0627\u0631\u0647\u200c\u062f\u0627\u0631\u06cc \u0646\u06cc\u0633\u062a'}</h3>
        <p className="text-xs text-muted-foreground">
          {'\u06a9\u0633\u0628\u200c\u0648\u06a9\u0627\u0631\u0647\u0627\u06cc \u0633\u062a\u0627\u0631\u0647\u200c\u062f\u0627\u062f\u0647\u200c\u0634\u062f\u0647 \u0627\u06cc\u0646\u062c\u0627 \u0646\u0645\u0627\u06cc\u0634 \u062f\u0627\u062f\u0647 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {businesses.map((business) => (
        <Link key={business.userId} href={business.profileUrl} className="block">
          <Card className="border-border/60 transition-colors hover:border-border hover:bg-muted/20">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-muted">
                {business.logo ? (
                  <Image
                    src={business.logo}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-sm font-bold text-muted-foreground">
                    {business.name.slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-semibold">{business.name}</span>
                  {business.verified && (
                    <BadgeCheck className="size-4 shrink-0 text-emerald-600" aria-hidden />
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {business.city && (
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="size-3" />
                      {business.city}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <StarRating rating={business.rating} size="sm" />
                    <span>{business.rating.toFixed(1)}</span>
                    <span>({business.reviewCount.toLocaleString('fa-IR')})</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

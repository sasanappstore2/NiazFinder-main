'use client';

import { useState } from 'react';
import { Clock, Shield, Star } from 'lucide-react';
import { StarRating } from '@/components/shared/StarRating';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { SectionProps } from './types';

const INITIAL_REVIEWS = 4;

export function TrustSection({ business }: SectionProps) {
  const [showAll, setShowAll] = useState(false);
  const reviews = showAll ? business.reviews : business.reviews.slice(0, INITIAL_REVIEWS);
  const hasMore = business.reviews.length > INITIAL_REVIEWS;

  return (
    <section id="section-trust" className="scroll-mt-24 space-y-4">
      <h2 className="text-lg font-semibold">اعتماد و نظرات</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <Star className="mx-auto mb-1 size-5 text-amber-500" />
            <p className="text-2xl font-bold">{business.trust.rating.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">{business.trust.reviewCount} نظر</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Shield className="mx-auto mb-1 size-5 text-primary" />
            <p className="text-2xl font-bold">{Math.round(business.trust.responseRate)}%</p>
            <p className="text-xs text-muted-foreground">نرخ پاسخ</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Clock className="mx-auto mb-1 size-5 text-muted-foreground" />
            <p className="text-lg font-bold">{business.trust.yearsActive || 1}+</p>
            <p className="text-xs text-muted-foreground">سال فعالیت</p>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-3">
        {reviews.map((r) => (
          <Card key={r.id}>
            <CardContent className="pt-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{r.userName}</span>
                <StarRating rating={r.rating} size="sm" />
              </div>
              <p className="text-sm text-muted-foreground">{r.comment}</p>
              {r.reply && (
                <p className="mt-2 border-r-2 border-primary pr-2 text-xs text-muted-foreground">
                  پاسخ: {r.reply}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {hasMore && !showAll && (
        <Button variant="outline" className="w-full" onClick={() => setShowAll(true)}>
          نمایش {business.reviews.length - INITIAL_REVIEWS} نظر دیگر
        </Button>
      )}
    </section>
  );
}

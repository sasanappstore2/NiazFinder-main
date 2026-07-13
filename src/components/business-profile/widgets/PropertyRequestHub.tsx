'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Clock, MapPin, Flame, Gem } from 'lucide-react';
import type { Business } from '@/contracts/business-profile';

interface RequestRow {
  id: string;
  title: string;
  city?: string | null;
  budget?: string | null;
}

interface RequestHubData {
  matching: RequestRow[];
  urgent: RequestRow[];
  nearby: RequestRow[];
  highValue: RequestRow[];
}

const GROUPS: Array<{ key: keyof RequestHubData; label: string; icon: React.ElementType }> = [
  { key: 'matching', label: 'متناسب با شما', icon: MapPin },
  { key: 'urgent', label: 'فوری', icon: Clock },
  { key: 'nearby', label: 'نزدیک شما', icon: Flame },
  { key: 'highValue', label: 'باارزش', icon: Gem },
];

export default function PropertyRequestHub({ business }: { business: Business }) {
  const [data, setData] = useState<RequestHubData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/business/${encodeURIComponent(business.id)}/request-hub`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: RequestHubData | null) => {
        if (cancelled) return;
        if (json) {
          setData(json);
          setState('ready');
        } else {
          setState('unavailable');
        }
      })
      .catch(() => !cancelled && setState('unavailable'));
    return () => {
      cancelled = true;
    };
  }, [business.id]);

  if (state === 'loading') {
    return <Loader2 className="size-5 animate-spin text-muted-foreground" />;
  }
  if (state === 'unavailable' || !data) {
    return <p className="text-sm text-muted-foreground">این بخش فقط برای مالک کسب‌وکار در دسترس است.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {GROUPS.map(({ key, label, icon: Icon }) => {
        const rows = data[key] ?? [];
        return (
          <div key={key} className="rounded-xl border p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Icon className="size-4 text-primary" />
              {label}
              <span className="text-xs text-muted-foreground">({rows.length.toLocaleString('fa-IR')})</span>
            </div>
            {rows.length === 0 ? (
              <p className="text-xs text-muted-foreground">موردی نیست.</p>
            ) : (
              <ul className="space-y-1.5">
                {rows.slice(0, 4).map((r) => (
                  <li key={r.id} className="rounded-lg border p-2 text-sm">
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {[r.city, r.budget].filter(Boolean).join(' · ')}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

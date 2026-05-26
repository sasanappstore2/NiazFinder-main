'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, MessageSquare, Loader2, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { getTimeAgo } from '@/lib/constants';

interface LeadItem {
  id: string;
  requestId: string;
  matchScore: number;
  matchReasonFa: string;
  conversationId: string | null;
  chatUrl: string | null;
  needUrl: string;
  request: {
    id: string;
    title: string;
    city: string | null;
    address: string | null;
    createdAt: string;
  };
  createdAt: string;
}

export function SmartLeadsSection() {
  const authToken = useAppStore((s) => s.authToken);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const currentUser = useAppStore((s) => s.currentUser);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isBusiness = currentUser?.role === 'SPECIALIST';

  useEffect(() => {
    if (!isAuthenticated || !authToken || !isBusiness) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void fetch('/api/business/leads', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((r) => (r.ok ? r.json() : { leads: [] }))
      .then((data: { leads?: LeadItem[] }) => {
        if (!cancelled) setLeads(data.leads ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authToken, isBusiness]);

  if (!isBusiness) return null;

  return (
    <Card className="border-emerald-200/50 dark:border-emerald-900/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="size-5 text-emerald-600" />
          لیدهای هوشمند
        </CardTitle>
        <CardDescription>
          نیازهایی که هوش مصنوعی نیازفایندر با کسب‌وکار شما هم‌خوان دانسته و در گفتگو معرفی کرده است.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : leads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            هنوز لید هوشمندی دریافت نکرده‌اید. با تکمیل پروفایل و دسته‌بندی، شانس دریافت لید بیشتر می‌شود.
          </p>
        ) : (
          <ul className="space-y-3">
            {leads.map((lead) => (
              <li
                key={lead.id}
                className="rounded-xl border border-border/60 p-3 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{lead.request.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(lead.matchScore * 100)}٪ تطابق
                    </Badge>
                  </div>
                  {(lead.request.address || lead.request.city) && (
                    <p className="text-caption text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="size-3" />
                      {[lead.request.address, lead.request.city].filter(Boolean).join('، ')}
                    </p>
                  )}
                  {lead.matchReasonFa && (
                    <p className="text-caption text-muted-foreground mt-1">{lead.matchReasonFa}</p>
                  )}
                  <p className="text-caption text-muted-foreground mt-1">{getTimeAgo(lead.createdAt)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {lead.chatUrl && (
                    <Button size="sm" variant="default" className="gap-1" asChild>
                      <Link href={lead.chatUrl}>
                        <MessageSquare className="size-3.5" />
                        گفتگو
                      </Link>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" asChild>
                    <Link href={lead.needUrl}>مشاهده نیاز</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock, Loader2, MessageSquare, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api-client';
import { formatPrice } from '@/lib/constants';
import { routeBuilder } from '@/config/routes';
import { useNavigate } from '@/hooks/navigation/use-navigate';

type PrivateLead = {
  id: string;
  requestId: string;
  matchScore: number;
  matchReasonFa: string;
  leadFeeAmount: number;
  conversationId: string | null;
  acceptedAt: string | null;
  request: {
    id: string;
    title: string;
    slug: string;
    city: string | null;
    needAccessStatus: string;
    vipExpiresAt: string | null;
    remainingMs: number;
    status: string;
  };
};

function formatCountdown(ms: number) {
  if (ms <= 0) return 'منقضی';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}س ${m}د`;
}

export function PrivateLeadsPanel() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<PrivateLead[]>([]);
  const [balance, setBalance] = useState(0);
  const [accepting, setAccepting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ leads: PrivateLead[]; wallet: { balance: number } }>('/api/business/private-leads');
      setLeads(res.leads ?? []);
      setBalance(res.wallet?.balance ?? 0);
    } catch {
      toast.error('بارگذاری لیدهای VIP ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const accept = async (outreachId: string) => {
    setAccepting(outreachId);
    try {
      const res = await apiFetch<{ session: { conversationId: string | null } }>(
        `/api/business/leads/${outreachId}/accept`,
        { method: 'POST', headers: { 'Idempotency-Key': `accept:${outreachId}` } }
      );
      toast.success('لید پذیرفته شد');
      if (res.session?.conversationId) {
        navigate.push(routeBuilder.chatConversation(res.session.conversationId));
      } else {
        void load();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'پذیرش لید ناموفق بود');
    } finally {
      setAccepting(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> در حال بارگذاری لیدهای VIP...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-emerald-200/60 dark:border-emerald-800/40">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="size-4 text-emerald-600" />
            <span>موجودی کیف پول:</span>
            <span className="font-semibold tabular-nums">{formatPrice(balance)}</span>
          </div>
          <Badge variant="secondary">لید VIP</Badge>
        </CardContent>
      </Card>

      {leads.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">لید VIP فعالی ندارید</CardContent>
        </Card>
      ) : (
        leads.map((lead) => (
          <Card key={lead.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{lead.request.title}</CardTitle>
              <CardDescription>{lead.matchReasonFa || lead.request.city || ''}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="gap-1"><Clock className="size-3" />{formatCountdown(lead.request.remainingMs)}</Badge>
                <span>هزینه لید: {formatPrice(lead.leadFeeAmount)}</span>
              </div>
              <Button size="sm" disabled={!!accepting} onClick={() => void accept(lead.id)}>
                {accepting === lead.id ? <Loader2 className="size-4 animate-spin" /> : <><MessageSquare className="size-4 ml-1" />پذیرش و چت</>}
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Building2, Sparkles, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api-client';

type PlanId = 'FREE' | 'PRO' | 'BUSINESS';

const PLAN_META: Record<PlanId, { label: string; icon: typeof Sparkles }> = {
  FREE: { label: 'رایگان', icon: Sparkles },
  PRO: { label: 'حرفه‌ای', icon: Star },
  BUSINESS: { label: 'سازمانی', icon: Building2 },
};

export function SubscriptionPlanCard() {
  const [plan, setPlan] = useState<PlanId>('FREE');
  const [pricing, setPricing] = useState<{ PRO: number; BUSINESS: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiFetch<{ plan: PlanId; pricing: { PRO: number; BUSINESS: number } }>(
          '/api/subscription'
        );
        setPlan(res.plan);
        setPricing(res.pricing);
      } catch {
        // best-effort — card just shows FREE defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function upgrade(target: 'PRO' | 'BUSINESS') {
    setUpgrading(target);
    setError(null);
    try {
      const res = await apiFetch<{ subscription: { plan: PlanId } }>('/api/subscription', {
        method: 'POST',
        body: JSON.stringify({ plan: target }),
      });
      setPlan(res.subscription.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ارتقای پلن');
    } finally {
      setUpgrading(null);
    }
  }

  if (loading) return null;

  return (
    <Card className="border-border/60">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">اشتراک شما</h3>
          <Badge variant="secondary" className="gap-1">
            {(() => {
              const Icon = PLAN_META[plan].icon;
              return <Icon className="size-3.5" />;
            })()}
            {PLAN_META[plan].label}
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(['PRO', 'BUSINESS'] as const).map((tier) => (
            <div
              key={tier}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3.5"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{PLAN_META[tier].label}</p>
                {pricing && (
                  <p className="text-xs text-muted-foreground">
                    {pricing[tier].toLocaleString('fa-IR')} تومان / ماه
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant={plan === tier ? 'secondary' : 'default'}
                disabled={plan === tier || upgrading !== null}
                onClick={() => upgrade(tier)}
              >
                {plan === tier ? 'فعال' : upgrading === tier ? 'در حال ارتقا...' : 'ارتقا'}
              </Button>
            </div>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { LayoutGrid, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import type { ProfileTabId } from '@/contracts/business-profile';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('nf_auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type TabOption = { id: ProfileTabId; labelFa: string };

export function BusinessProfileTabSettings() {
  const [defaultTab, setDefaultTab] = useState<ProfileTabId>('intro');
  const [tabs, setTabs] = useState<TabOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/business/me/layout', { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = (await res.json()) as {
          defaultTab?: ProfileTabId;
          tabs?: TabOption[];
        };
        if (!cancelled) {
          if (data.defaultTab) setDefaultTab(data.defaultTab);
          if (data.tabs?.length) setTabs(data.tabs);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = async (tab: ProfileTabId) => {
    const prev = defaultTab;
    setDefaultTab(tab);
    setSaving(true);
    try {
      const res = await fetch('/api/business/me/layout', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ defaultTab: tab }),
      });
      if (!res.ok) {
        setDefaultTab(prev);
        toast.error('ذخیره تب پیش‌فرض ناموفق بود');
        return;
      }
      toast.success('تب پیش‌فرض پروفایل ذخیره شد');
    } catch {
      setDefaultTab(prev);
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setSaving(false);
    }
  };

  const gridCols = tabs.length <= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4';

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <LayoutGrid className="size-4 text-emerald-500" />
          <h3 className="text-sm font-bold">تب پیش‌فرض پروفایل کسب‌وکار</h3>
          {saving && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <Separator className="mb-5 bg-border/60" />
        <p className="mb-4 text-sm text-muted-foreground">
          وقتی بازدیدکننده وارد صفحه کسب‌وکار شما می‌شود، کدام زبانه ابتدا نمایش داده شود؟
        </p>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            در حال بارگذاری...
          </div>
        ) : (
          <RadioGroup
            value={defaultTab}
            onValueChange={(v) => handleChange(v as ProfileTabId)}
            className={`grid gap-3 ${gridCols}`}
            disabled={saving}
          >
            {tabs.map((tab) => (
              <Label
                key={tab.id}
                htmlFor={`default-tab-${tab.id}`}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/80 px-4 py-3 transition-colors has-data-[state=checked]:border-emerald-500/50 has-data-[state=checked]:bg-emerald-500/5"
              >
                <RadioGroupItem id={`default-tab-${tab.id}`} value={tab.id} />
                <span className="text-sm font-medium">{tab.labelFa}</span>
              </Label>
            ))}
          </RadioGroup>
        )}
      </CardContent>
    </Card>
  );
}

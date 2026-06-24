'use client';

import { useEffect, useState } from 'react';
import { GripVertical, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { WidgetConfig } from '@/lib/business/widget-registry';
import { useRealEstateHub } from '../RealEstateHubProvider';

export function RealEstateWidgetsPanel() {
  const { widgetConfig, widgetDefinitions, reLoading, saveWidgetConfig } = useRealEstateHub();
  const [config, setConfig] = useState<WidgetConfig[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setConfig(widgetConfig);
  }, [widgetConfig]);

  if (reLoading) {
    return (
      <div className="flex items-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        در حال بارگذاری...
      </div>
    );
  }

  const titleFor = (id: string) =>
    widgetDefinitions.find((d) => d.id === id)?.title ?? id;

  const toggle = (id: string, enabled: boolean) => {
    setConfig((prev) => prev.map((w) => (w.id === id ? { ...w, enabled } : w)));
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveWidgetConfig(config);
      toast.success('تنظیمات ویجت ذخیره شد');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ذخیره ناموفق بود');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        هر بخش زیر یک ویجت در صفحه عمومی شماست. می‌توانید نمایش آن‌ها را روشن یا خاموش کنید.
      </p>

      <ul className="divide-y rounded-xl border border-border/60">
        {config.map((entry) => (
          <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
            <GripVertical className="size-4 shrink-0 text-muted-foreground/40" />
            <div className="min-w-0 flex-1">
              <Label htmlFor={`widget-${entry.id}`} className="font-medium">
                {titleFor(entry.id)}
              </Label>
            </div>
            <Switch
              id={`widget-${entry.id}`}
              checked={entry.enabled}
              onCheckedChange={(checked) => toggle(entry.id, checked)}
            />
          </li>
        ))}
      </ul>

      <div className="flex justify-end">
        <Button onClick={() => void save()} disabled={saving} className="gap-2 bg-blue-600 hover:bg-blue-700">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          ذخیره ویجت‌ها
        </Button>
      </div>
    </div>
  );
}

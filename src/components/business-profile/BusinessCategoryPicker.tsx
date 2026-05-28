'use client';

import { useEffect, useMemo, useState } from 'react';
import { FolderTree, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { getBlueprintForOccupationSlug } from '@/config/business-profile-blueprints';
import { BusinessProfileCategoryTabs } from '@/components/business-profile/BusinessProfileCategoryTabs';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('nf_auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function BusinessCategoryPicker({
  onCategorySaved,
}: {
  onCategorySaved?: (slug: string) => void;
}) {
  const [occupationSlugs, setOccupationSlugs] = useState<string[]>([]);
  const [template, setTemplate] = useState('');
  const [blueprintTitle, setBlueprintTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/business/me/categories', { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = (await res.json()) as {
          primaryCategorySlug?: string;
          occupationSlugs?: string[];
          categorySlugs?: string[];
          template?: string;
          blueprintTitle?: string;
        };
        if (!cancelled) {
          const slugs =
            data.occupationSlugs ??
            data.categorySlugs ??
            (data.primaryCategorySlug ? [data.primaryCategorySlug] : []);
          setOccupationSlugs(slugs);
          setTemplate(data.template ?? '');
          setBlueprintTitle(data.blueprintTitle ?? '');
          if (slugs[0]) onCategorySaved?.(slugs[0]);
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
  }, [onCategorySaved]);

  const primary = occupationSlugs[0] ?? '';

  const previewBlueprint = useMemo(() => {
    if (!primary) return null;
    return getBlueprintForOccupationSlug(primary);
  }, [primary]);

  const handleChange = async (slugs: string[]) => {
    const prev = occupationSlugs;
    setOccupationSlugs(slugs);
    setSaving(true);
    try {
      const res = await fetch('/api/business/me/categories', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ occupationSlugs: slugs }),
      });
      if (!res.ok) {
        setOccupationSlugs(prev);
        toast.error('ذخیره دسته‌بندی ناموفق بود');
        return;
      }
      const data = (await res.json()) as { template?: string; blueprintTitle?: string };
      setTemplate(data.template ?? '');
      setBlueprintTitle(data.blueprintTitle ?? '');
      if (slugs[0]) onCategorySaved?.(slugs[0]);
      toast.success('دسته‌بندی و سبک پروفایل ذخیره شد');
    } catch {
      setOccupationSlugs(prev);
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <FolderTree className="size-4 text-emerald-500" />
          <h3 className="text-sm font-bold">شغل / فروشگاه و سبک پروفایل</h3>
          {saving && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <Separator className="mb-5 bg-border/60" />
        <p className="mb-4 text-sm text-muted-foreground">
          شغل یا حوزهٔ فروشگاه اینترنتی خود را انتخاب کنید تا تب‌ها و بخش‌های پروفایل متناسب
          تنظیم شود.
        </p>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            در حال بارگذاری...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>شغل یا فروشگاه اینترنتی</Label>
              <div className={saving ? 'pointer-events-none opacity-60' : undefined}>
                <BusinessProfileCategoryTabs
                  selectedSlugs={occupationSlugs}
                  onChange={handleChange}
                />
              </div>
            </div>
            {(template || previewBlueprint) && (
              <div className="rounded-xl border bg-muted/40 p-4 text-sm">
                <p>
                  <span className="text-muted-foreground">سبک پروفایل: </span>
                  <span className="font-medium">{blueprintTitle || previewBlueprint?.titleFa}</span>
                </p>
                {previewBlueprint && (
                  <p className="mt-2 text-muted-foreground">
                    تب‌ها:{' '}
                    {previewBlueprint.tabs.map((t) => t.labelFa).join(' · ')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

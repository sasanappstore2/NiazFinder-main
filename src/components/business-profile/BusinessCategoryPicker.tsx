'use client';

import { useEffect, useMemo, useState } from 'react';
import { FolderTree, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { CANONICAL_CATEGORIES } from '@/config/categories';
import { getBlueprintForCategorySlug } from '@/config/business-profile-blueprints';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('nf_auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Pickable categories: depth-1 parents and depth-2 leaves (not section roots). */
const PICKABLE = CANONICAL_CATEGORIES.filter((c) => c.depth >= 1).sort((a, b) =>
  a.title.localeCompare(b.title, 'fa')
);

export function BusinessCategoryPicker({
  onCategorySaved,
}: {
  onCategorySaved?: (slug: string) => void;
}) {
  const [primary, setPrimary] = useState('');
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
          template?: string;
          blueprintTitle?: string;
        };
        if (!cancelled) {
          setPrimary(data.primaryCategorySlug ?? '');
          setTemplate(data.template ?? '');
          setBlueprintTitle(data.blueprintTitle ?? '');
          if (data.primaryCategorySlug) {
            onCategorySaved?.(data.primaryCategorySlug);
          }
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

  const previewBlueprint = useMemo(() => {
    if (!primary) return null;
    return getBlueprintForCategorySlug(primary);
  }, [primary]);

  const handleChange = async (slug: string) => {
    const prev = primary;
    setPrimary(slug);
    setSaving(true);
    try {
      const res = await fetch('/api/business/me/categories', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ primaryCategorySlug: slug }),
      });
      if (!res.ok) {
        setPrimary(prev);
        toast.error('ذخیره دسته‌بندی ناموفق بود');
        return;
      }
      const data = (await res.json()) as { template?: string; blueprintTitle?: string };
      setTemplate(data.template ?? '');
      setBlueprintTitle(data.blueprintTitle ?? '');
      onCategorySaved?.(slug);
      toast.success('دسته‌بندی و سبک پروفایل ذخیره شد');
    } catch {
      setPrimary(prev);
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
          <h3 className="text-sm font-bold">دسته‌بندی و سبک پروفایل</h3>
          {saving && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <Separator className="mb-5 bg-border/60" />
        <p className="mb-4 text-sm text-muted-foreground">
          با انتخاب دسته اصلی، تب‌ها و بخش‌های پروفایل کسب‌وکار شما متناسب با همان حوزه تنظیم
          می‌شود (مثلاً فروشگاه → محصولات، مربی → گالری).
        </p>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            در حال بارگذاری...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>دسته اصلی کسب‌وکار</Label>
              <Select value={primary} onValueChange={handleChange} disabled={saving}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب دسته..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {PICKABLE.map((cat) => (
                    <SelectItem key={cat.slug} value={cat.slug}>
                      {cat.title}
                      {cat.depth === 2 ? ' · زیردسته' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

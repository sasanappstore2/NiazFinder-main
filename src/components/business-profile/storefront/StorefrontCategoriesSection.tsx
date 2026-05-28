'use client';

import { useState } from 'react';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { StorefrontCategory } from '@/contracts/business-profile';
import { createStorefrontCategoryId } from '@/lib/business/storefront';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';

export function StorefrontCategoriesSection({
  categories,
  productCountByCategory,
  onCategoriesChange,
  onCategoryDeleted,
}: {
  categories: StorefrontCategory[];
  productCountByCategory: (id: string) => number;
  onCategoriesChange: (next: StorefrontCategory[]) => Promise<boolean>;
  onCategoryDeleted: (id: string) => Promise<void>;
}) {
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setSaving(true);
    const next: StorefrontCategory[] = [
      ...categories,
      { id: createStorefrontCategoryId(), title, sortOrder: categories.length },
    ];
    if (await onCategoriesChange(next)) {
      setNewTitle('');
      toast.success('دسته اضافه شد');
    }
    setSaving(false);
  };

  const commitRename = async (id: string) => {
    const title = editingTitle.trim();
    if (!title) return;
    setSaving(true);
    const next = categories.map((c) => (c.id === id ? { ...c, title } : c));
    if (await onCategoriesChange(next)) {
      setEditingId(null);
      toast.success('نام دسته به‌روز شد');
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    setSaving(true);
    const next = categories.filter((c) => c.id !== id);
    if (await onCategoriesChange(next)) {
      await onCategoryDeleted(id);
      toast.success('دسته حذف شد');
    }
    setSaving(false);
  };

  return (
    <section className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <Layers className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        <div>
          <h2 className="text-base font-semibold">دسته‌بندی ویترین</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            قفسه‌های فروشگاه — محصولات را می‌توانید در چند دسته قرار دهید
          </p>
        </div>
      </div>

      {categories.length === 0 ? (
        <p className="mb-3 text-sm text-muted-foreground">
          هنوز دسته‌ای ندارید. می‌توانید بدون دسته هم محصول اضافه کنید.
        </p>
      ) : (
        <ul className="mb-3 space-y-2">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2"
            >
              {editingId === cat.id ? (
                <>
                  <Input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="h-9 flex-1"
                  />
                  <Button size="sm" type="button" onClick={() => void commitRename(cat.id)} disabled={saving}>
                    ذخیره
                  </Button>
                  <Button size="sm" variant="ghost" type="button" onClick={() => setEditingId(null)}>
                    انصراف
                  </Button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{cat.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {productCountByCategory(cat.id).toLocaleString('fa-IR')} محصول
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    type="button"
                    onClick={() => {
                      setEditingId(cat.id);
                      setEditingTitle(cat.title);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    type="button"
                    onClick={() => void remove(cat.id)}
                    disabled={saving}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="نام دسته جدید"
          className="h-10"
          onKeyDown={(e) => e.key === 'Enter' && void add()}
        />
        <Button type="button" variant="outline" className="h-10 shrink-0" onClick={() => void add()} disabled={saving}>
          <Plus className="ms-1 size-4" />
          دسته
        </Button>
      </div>
    </section>
  );
}

/** Strip deleted category from all offers */
export async function stripCategoryFromOffers(categoryId: string) {
  const res = await fetch('/api/business/me/offers', { headers: getClientAuthHeaders() });
  if (!res.ok) return;
  const data = (await res.json()) as {
    offers?: {
      id: string;
      categoryIds?: string[];
      primaryCategoryId?: string | null;
    }[];
  };
  for (const o of data.offers ?? []) {
    const ids = o.categoryIds ?? [];
    if (!ids.includes(categoryId)) continue;
    const nextIds = ids.filter((x) => x !== categoryId);
    let primary = o.primaryCategoryId;
    if (primary === categoryId) primary = nextIds[0] ?? null;
    await fetch(`/api/business/me/offers/${o.id}`, {
      method: 'PATCH',
      headers: getClientAuthHeaders(),
      body: JSON.stringify({ categoryIds: nextIds, primaryCategoryId: primary }),
    });
  }
}

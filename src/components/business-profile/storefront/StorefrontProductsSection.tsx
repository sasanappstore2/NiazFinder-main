'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Loader2, Package, Pencil, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { OfferVariant, StorefrontCategory } from '@/contracts/business-profile';
import { offerMatchesCategoryFilter } from '@/lib/business/offer-storefront-meta';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';
import { cn } from '@/lib/utils';
import {
  ProductEditorForm,
  EMPTY_PRODUCT_FORM,
  type ProductFormValues,
} from './ProductEditorForm';

export type StorefrontOfferRow = {
  id: string;
  title: string;
  description: string;
  priceRange?: string;
  images: string[];
  categoryIds: string[];
  primaryCategoryId: string | null;
  variants: OfferVariant[];
  vitrineCategoryId?: string | null;
};

function offerToForm(o: StorefrontOfferRow): ProductFormValues {
  return {
    title: o.title,
    description: o.description,
    priceRange: o.priceRange ?? '',
    images: o.images,
    categoryIds: o.categoryIds,
    primaryCategoryId: o.primaryCategoryId,
    variants: o.variants,
  };
}

export function StorefrontProductsSection({
  categories,
  offers,
  loading,
  primaryLabel,
  onReload,
  onMutate,
}: {
  categories: StorefrontCategory[];
  offers: StorefrontOfferRow[];
  loading: boolean;
  primaryLabel: string | null;
  onReload: () => Promise<void>;
  onMutate?: () => void;
}) {
  const [filterId, setFilterId] = useState<string | null>(null);
  const [editor, setEditor] = useState<'closed' | 'create' | string>('closed');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!filterId) return offers;
    return offers.filter((o) =>
      offerMatchesCategoryFilter(
        { categoryIds: o.categoryIds, primaryCategoryId: o.primaryCategoryId },
        filterId
      )
    );
  }, [offers, filterId]);

  const categoryTitle = (id: string) => categories.find((c) => c.id === id)?.title ?? '—';

  const saveProduct = async (values: ProductFormValues, offerId?: string) => {
    if (!values.title.trim() || !values.description.trim()) {
      toast.error('نام و توضیحات الزامی است');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: values.title.trim(),
        description: values.description.trim(),
        priceRange: values.priceRange.trim() || null,
        images: values.images,
        categoryIds: values.categoryIds,
        primaryCategoryId: values.primaryCategoryId,
        variants: values.variants.filter((v) => v.name.trim()),
        ctaType: 'chat',
      };
      const res = offerId
        ? await fetch(`/api/business/me/offers/${offerId}`, {
            method: 'PATCH',
            headers: getClientAuthHeaders(),
            body: JSON.stringify(payload),
          })
        : await fetch('/api/business/me/offers', {
            method: 'POST',
            headers: getClientAuthHeaders(),
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'ذخیره ناموفق بود');
        return;
      }
      toast.success(offerId ? 'محصول به‌روز شد' : 'محصول اضافه شد');
      setEditor('closed');
      await onReload();
      onMutate?.();
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    await fetch(`/api/business/me/offers/${id}`, {
      method: 'DELETE',
      headers: getClientAuthHeaders(),
    });
    toast.success('محصول حذف شد');
    if (editor === id) setEditor('closed');
    await onReload();
    onMutate?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        در حال بارگذاری محصولات...
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShoppingBag className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <h2 className="text-base font-semibold">محصولات و خدمات</h2>
            <p className="text-sm text-muted-foreground">
              {offers.length.toLocaleString('fa-IR')} مورد
              {primaryLabel && (
                <>
                  {' · '}
                  <span className="text-foreground">{primaryLabel}</span>
                </>
              )}
            </p>
          </div>
        </div>
        {editor === 'closed' && (
          <Button type="button" className="gap-2" onClick={() => setEditor('create')}>
            <Plus className="size-4" />
            محصول جدید
          </Button>
        )}
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="فیلتر دسته">
          <FilterChip active={!filterId} onClick={() => setFilterId(null)}>
            همه ({offers.length.toLocaleString('fa-IR')})
          </FilterChip>
          {categories.map((cat) => {
            const count = offers.filter((o) =>
              offerMatchesCategoryFilter(
                { categoryIds: o.categoryIds, primaryCategoryId: o.primaryCategoryId },
                cat.id
              )
            ).length;
            return (
              <FilterChip
                key={cat.id}
                active={filterId === cat.id}
                onClick={() => setFilterId(cat.id)}
              >
                {cat.title} ({count.toLocaleString('fa-IR')})
              </FilterChip>
            );
          })}
        </div>
      )}

      {editor === 'create' && (
        <ProductEditorForm
          categories={categories}
          initial={EMPTY_PRODUCT_FORM}
          title="محصول جدید"
          saving={saving}
          onCancel={() => setEditor('closed')}
          onSave={(v) => saveProduct(v)}
        />
      )}

      {editor !== 'closed' && editor !== 'create' && (
        <ProductEditorForm
          categories={categories}
          initial={offerToForm(offers.find((o) => o.id === editor)!)}
          title="ویرایش محصول"
          saving={saving}
          onCancel={() => setEditor('closed')}
          onSave={(v) => saveProduct(v, editor)}
        />
      )}

      {editor === 'closed' && (
        <>
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-10 text-center">
              <Package className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">
                {filterId ? 'در این دسته محصولی نیست' : 'هنوز محصولی ثبت نشده'}
              </p>
              {!filterId && (
                <Button type="button" className="mt-4 gap-2" onClick={() => setEditor('create')}>
                  <Plus className="size-4" />
                  اولین محصول
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((o) => (
                <article
                  key={o.id}
                  className="flex gap-3 rounded-xl border bg-card p-3 shadow-xs transition hover:border-emerald-500/30"
                >
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {o.images[0] ? (
                      <Image src={o.images[0]} alt="" fill className="object-cover" sizes="64px" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
                        بدون عکس
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug line-clamp-1">{o.title}</p>
                    {o.priceRange && (
                      <p className="text-sm text-emerald-700 dark:text-emerald-400">{o.priceRange}</p>
                    )}
                    {o.variants.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {o.variants.length.toLocaleString('fa-IR')} متغیر
                      </p>
                    )}
                    {o.categoryIds.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {o.categoryIds.map((cid) => (
                          <Badge
                            key={cid}
                            variant="secondary"
                            className={cn(
                              'text-[10px] px-1.5 py-0',
                              o.primaryCategoryId === cid && 'bg-amber-500/15 text-amber-900'
                            )}
                          >
                            {categoryTitle(cid)}
                            {o.primaryCategoryId === cid ? ' ★' : ''}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() => setEditor(o.id)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => void deleteProduct(o.id)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200'
          : 'border-border/60 bg-background text-muted-foreground hover:bg-accent'
      )}
    >
      {children}
    </button>
  );
}

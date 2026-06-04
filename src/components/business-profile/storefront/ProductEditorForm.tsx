'use client';

import { useState } from 'react';
import { Loader2, Plus, Save, Star, Tag, Trash2, X } from 'lucide-react';
import type { OfferVariant } from '@/contracts/business-profile';
import type { StorefrontCategory, StorefrontBrand } from '@/contracts/business-profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { createVariantId } from '@/lib/business/offer-storefront-meta';
import { ProductImageGrid } from './ProductImageGrid';
import { cn } from '@/lib/utils';

export type ProductFormValues = {
  title: string;
  description: string;
  priceRange: string;
  images: string[];
  categoryIds: string[];
  primaryCategoryId: string | null;
  brandId: string | null;
  variants: OfferVariant[];
};

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  title: '',
  description: '',
  priceRange: '',
  images: [],
  categoryIds: [],
  primaryCategoryId: null,
  brandId: null,
  variants: [],
};

export function ProductEditorForm({
  categories,
  brands,
  onAddBrand,
  initial,
  title,
  onSave,
  onCancel,
  saving,
}: {
  categories: StorefrontCategory[];
  brands: StorefrontBrand[];
  onAddBrand: (title: string) => Promise<string | null>;
  initial: ProductFormValues;
  title: string;
  onSave: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<ProductFormValues>(initial);
  const [newBrandTitle, setNewBrandTitle] = useState('');
  const [addingBrand, setAddingBrand] = useState(false);

  const toggleCategory = (catId: string, checked: boolean) => {
    setForm((prev) => {
      let categoryIds = checked
        ? [...new Set([...prev.categoryIds, catId])]
        : prev.categoryIds.filter((id) => id !== catId);
      let primaryCategoryId = prev.primaryCategoryId;
      if (!checked && primaryCategoryId === catId) {
        primaryCategoryId = categoryIds[0] ?? null;
      }
      if (checked && categoryIds.length === 1) {
        primaryCategoryId = catId;
      }
      return { ...prev, categoryIds, primaryCategoryId };
    });
  };

  const setPrimary = (catId: string) => {
    setForm((prev) => ({
      ...prev,
      primaryCategoryId: catId,
      categoryIds: prev.categoryIds.includes(catId)
        ? prev.categoryIds
        : [...prev.categoryIds, catId],
    }));
  };

  const addVariant = () => {
    setForm((prev) => ({
      ...prev,
      variants: [...prev.variants, { id: createVariantId(), name: '', price: '' }],
    }));
  };

  const updateVariant = (id: string, patch: Partial<OfferVariant>) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    }));
  };

  const removeVariant = (id: string) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((v) => v.id !== id),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
  };

  const handleAddBrand = async () => {
    const label = newBrandTitle.trim();
    if (!label) return;
    setAddingBrand(true);
    try {
      const id = await onAddBrand(label);
      if (id) {
        setForm((prev) => ({ ...prev, brandId: id }));
        setNewBrandTitle('');
      }
    } finally {
      setAddingBrand(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6 rounded-xl border bg-muted/15 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel} aria-label="بستن">
          <X className="size-4" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="pe-title">نام محصول یا خدمت</Label>
          <Input
            id="pe-title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="h-10"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pe-price">قیمت پایه (اختیاری)</Label>
          <Input
            id="pe-price"
            value={form.priceRange}
            onChange={(e) => setForm({ ...form, priceRange: e.target.value })}
            placeholder="از ۲۹۰٬۰۰۰ تومان"
            className="h-10"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="pe-desc">توضیحات</Label>
          <Textarea
            id="pe-desc"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            required
          />
        </div>
      </div>

      <ProductImageGrid images={form.images} onChange={(images) => setForm({ ...form, images })} />

      <div className="space-y-3 rounded-lg border bg-background p-3">
        <div className="flex items-center gap-2">
          <Tag className="size-4 text-muted-foreground" />
          <Label>برند محصول (اختیاری)</Label>
        </div>
        {brands.length > 0 ? (
          <Select
            value={form.brandId ?? '_none'}
            onValueChange={(val) =>
              setForm({ ...form, brandId: val === '_none' ? null : val })
            }
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="انتخاب برند" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">بدون برند</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-xs text-muted-foreground">هنوز برندی ثبت نشده — می‌توانید همین‌جا اضافه کنید.</p>
        )}
        <div className="flex gap-2">
          <Input
            value={newBrandTitle}
            onChange={(e) => setNewBrandTitle(e.target.value)}
            placeholder="نام برند جدید"
            className="h-10"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), void handleAddBrand())}
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0"
            disabled={addingBrand || saving || !newBrandTitle.trim()}
            onClick={() => void handleAddBrand()}
          >
            {addingBrand ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Plus className="ms-1 size-4" />
                برند
              </>
            )}
          </Button>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="space-y-2">
          <Label>دسته‌بندی (می‌توانید چند دسته انتخاب کنید)</Label>
          <p className="text-xs text-muted-foreground">
            ستاره = دستهٔ اصلی — در فیلتر و نمایش اولویت دارد
          </p>
          <ul className="space-y-2 rounded-lg border bg-background p-3">
            {categories.map((cat) => {
              const checked = form.categoryIds.includes(cat.id);
              const isPrimary = form.primaryCategoryId === cat.id;
              return (
                <li key={cat.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`cat-${cat.id}`}
                    checked={checked}
                    onCheckedChange={(v) => toggleCategory(cat.id, v === true)}
                  />
                  <label htmlFor={`cat-${cat.id}`} className="flex-1 cursor-pointer text-sm">
                    {cat.title}
                  </label>
                  <Button
                    type="button"
                    variant={isPrimary ? 'secondary' : 'ghost'}
                    size="icon"
                    className={cn('size-8 shrink-0', isPrimary && 'text-amber-600')}
                    disabled={!checked}
                    title="دسته اصلی"
                    onClick={() => setPrimary(cat.id)}
                  >
                    <Star className={cn('size-4', isPrimary && 'fill-current')} />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>متغیرها (رنگ، سایز، …)</Label>
            <p className="text-xs text-muted-foreground">اختیاری — برای هر متغیر قیمت و عکس جدا</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addVariant}>
            <Plus className="ms-1 size-4" />
            متغیر
          </Button>
        </div>
        {form.variants.map((v) => (
          <div
            key={v.id}
            className="grid gap-2 rounded-lg border bg-background p-3 sm:grid-cols-[1fr_120px_1fr_auto]"
          >
            <Input
              value={v.name}
              onChange={(e) => updateVariant(v.id, { name: e.target.value })}
              placeholder="مثلاً قرمز — سایز L"
              className="h-9"
            />
            <Input
              value={v.price ?? ''}
              onChange={(e) => updateVariant(v.id, { price: e.target.value })}
              placeholder="قیمت"
              className="h-9"
            />
            <Select
              value={v.imageUrl || '_none'}
              onValueChange={(val) =>
                updateVariant(v.id, { imageUrl: val === '_none' ? undefined : val })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="عکس متغیر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">بدون عکس جدا</SelectItem>
                {form.images.map((url, i) => (
                  <SelectItem key={url} value={url}>
                    تصویر {(i + 1).toLocaleString('fa-IR')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={() => removeVariant(v.id)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button type="submit" disabled={saving} className="min-h-11 gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          ذخیره محصول
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          انصراف
        </Button>
      </div>
    </form>
  );
}

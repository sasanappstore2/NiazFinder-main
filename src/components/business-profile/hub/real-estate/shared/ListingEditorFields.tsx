'use client';

import { useMemo, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PropertyListing } from '@/contracts/business-profile';
import {
  getPropertyListingCategories,
  inferDealTypeFromCategorySlug,
} from '@/lib/business/real-estate-listing-categories';
import {
  PROPERTY_LISTING_DEAL_TYPES,
  normalizeListingDealType,
  type PropertyListingDealType,
} from '@/lib/business/real-estate-listing-deal-types';
import {
  getListingFormConfig,
  getListingFormProfile,
  type ListingFormConfig,
} from '@/lib/business/real-estate-listing-form-config';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ListingImagesUpload, listingImagesFromValue } from './ListingImagesUpload';
import { ListingNeighborhoodPicker } from './ListingNeighborhoodPicker';

export type ListingFormValue = Omit<PropertyListing, 'id'>;

const FIELD_H = 'h-10';

const motionField = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const },
};

function ListingField({
  label,
  children,
  className,
  required,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? ' *' : ''}
      </Label>
      {children}
    </div>
  );
}

function pruneForConfig(
  value: ListingFormValue,
  config: ListingFormConfig
): Partial<ListingFormValue> {
  return {
    ...value,
    rooms: config.showRooms ? value.rooms : undefined,
    floor: config.showFloor ? value.floor : undefined,
    deedType: config.showDeedType ? value.deedType : undefined,
    pricePerMeter: config.showPricePerMeter ? value.pricePerMeter : undefined,
    plotWidth: config.showPlotWidth ? value.plotWidth : undefined,
    price: config.showPrice ? value.price : undefined,
    deposit: config.showDeposit ? value.deposit : undefined,
    monthlyRent: config.showMonthlyRent ? value.monthlyRent : undefined,
  };
}

function DynamicSpecs({
  config,
  value,
  onChange,
  showStatus,
}: {
  config: ListingFormConfig;
  value: ListingFormValue;
  onChange: (patch: Partial<ListingFormValue>) => void;
  showStatus?: boolean;
}) {
  const profileKey = `${config.profile}-${normalizeListingDealType(value.dealType)}`;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={profileKey}
        layout
        className="overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {config.showPrice && (
              <motion.div key="price" {...motionField} className="col-span-2 sm:col-span-1">
                <ListingField label={config.priceLabel}>
                  <Input
                    value={value.price ?? ''}
                    onChange={(e) => onChange({ price: e.target.value })}
                    className={FIELD_H}
                  />
                </ListingField>
              </motion.div>
            )}

            {config.showDeposit && (
              <motion.div key="deposit" {...motionField} className="col-span-2 sm:col-span-1">
                <ListingField label={config.depositLabel}>
                  <Input
                    value={value.deposit ?? ''}
                    onChange={(e) => onChange({ deposit: e.target.value })}
                    className={FIELD_H}
                  />
                </ListingField>
              </motion.div>
            )}

            {config.showMonthlyRent && (
              <motion.div key="monthlyRent" {...motionField} className="col-span-2 sm:col-span-1">
                <ListingField label={config.monthlyRentLabel}>
                  <Input
                    value={value.monthlyRent ?? ''}
                    onChange={(e) => onChange({ monthlyRent: e.target.value })}
                    className={FIELD_H}
                  />
                </ListingField>
              </motion.div>
            )}

            <motion.div key="area" {...motionField} className="col-span-1">
              <ListingField label={config.areaLabel}>
                <Input
                  value={value.area ?? ''}
                  onChange={(e) => onChange({ area: e.target.value })}
                  className={FIELD_H}
                />
              </ListingField>
            </motion.div>

            {config.showRooms && (
              <motion.div key="rooms" {...motionField} className="col-span-1">
                <ListingField label="اتاق">
                  <Input
                    type="number"
                    min={0}
                    value={value.rooms ?? ''}
                    onChange={(e) =>
                      onChange({
                        rooms: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className={FIELD_H}
                  />
                </ListingField>
              </motion.div>
            )}

            {config.showFloor && (
              <motion.div key="floor" {...motionField} className="col-span-1">
                <ListingField label="طبقه">
                  <Input
                    type="number"
                    value={value.floor ?? ''}
                    onChange={(e) =>
                      onChange({
                        floor: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="مثلاً ۳"
                    className={FIELD_H}
                  />
                </ListingField>
              </motion.div>
            )}

            {config.showPlotWidth && (
              <motion.div key="plotWidth" {...motionField} className="col-span-1">
                <ListingField label="عرض زمین (متر)">
                  <Input
                    value={value.plotWidth ?? ''}
                    onChange={(e) => onChange({ plotWidth: e.target.value })}
                    className={FIELD_H}
                  />
                </ListingField>
              </motion.div>
            )}

            {config.showPricePerMeter && (
              <motion.div key="pricePerMeter" {...motionField} className="col-span-2 sm:col-span-1">
                <ListingField label="قیمت هر متر">
                  <Input
                    value={value.pricePerMeter ?? ''}
                    onChange={(e) => onChange({ pricePerMeter: e.target.value })}
                    className={FIELD_H}
                  />
                </ListingField>
              </motion.div>
            )}

            {config.showDeedType && (
              <motion.div key="deedType" {...motionField} className="col-span-2 sm:col-span-1">
                <ListingField label="نوع سند">
                  <Select
                    value={value.deedType ?? '_unset'}
                    onValueChange={(v) =>
                      onChange({ deedType: v === '_unset' ? undefined : v })
                    }
                  >
                    <SelectTrigger className={FIELD_H}>
                      <SelectValue placeholder="انتخاب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_unset">انتخاب</SelectItem>
                      {config.deedOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ListingField>
              </motion.div>
            )}

            {showStatus && (
              <motion.div key="status" {...motionField} className="col-span-2 sm:col-span-1">
                <ListingField label="وضعیت">
                  <Select
                    value={value.status ?? 'active'}
                    onValueChange={(v) => onChange({ status: v as ListingFormValue['status'] })}
                  >
                    <SelectTrigger className={FIELD_H}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">فعال</SelectItem>
                      <SelectItem value="sold">فروخته‌شده</SelectItem>
                      <SelectItem value="rented">اجاره رفته</SelectItem>
                    </SelectContent>
                  </Select>
                </ListingField>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

type ListingEditorFieldsProps = {
  value: ListingFormValue;
  onChange: (patch: Partial<ListingFormValue>) => void;
  showStatus?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
};

export function ListingEditorFields({
  value,
  onChange,
  showStatus = false,
  onUploadingChange,
}: ListingEditorFieldsProps) {
  const dealType = normalizeListingDealType(value.dealType);
  const categories = useMemo(() => getPropertyListingCategories(dealType), [dealType]);
  const config = useMemo(
    () => getListingFormConfig(value.categorySlug, dealType),
    [value.categorySlug, dealType]
  );
  const images = listingImagesFromValue(value);
  const categorySelected = Boolean(value.categorySlug);

  const setDealType = (next: PropertyListingDealType) => {
    let patch: Partial<ListingFormValue> = { dealType: next };
    if (value.categorySlug) {
      const inferred = inferDealTypeFromCategorySlug(value.categorySlug);
      if (inferred && normalizeListingDealType(inferred) !== next) {
        patch = { ...patch, categorySlug: undefined };
      }
    }
    const nextConfig = getListingFormConfig(patch.categorySlug ?? value.categorySlug, next);
    onChange(pruneForConfig({ ...value, ...patch }, nextConfig));
  };

  const setCategory = (slug: string | undefined) => {
    const inferred = slug ? inferDealTypeFromCategorySlug(slug) : undefined;
    const patch: Partial<ListingFormValue> = {
      categorySlug: slug,
      ...(inferred ? { dealType: inferred } : {}),
    };
    const nextConfig = getListingFormConfig(slug, inferred ?? dealType);
    onChange(pruneForConfig({ ...value, ...patch }, nextConfig));
  };

  return (
    <div className="space-y-4">
      <ListingImagesUpload
        images={images}
        onUploadingChange={onUploadingChange}
        onChange={(nextImages) =>
          onChange({
            images: nextImages,
            image: nextImages[0],
          })
        }
      />

      <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
        <ListingField label="نوع معامله">
          <Select value={dealType} onValueChange={(v) => setDealType(v as PropertyListingDealType)}>
            <SelectTrigger className={cn(FIELD_H, 'w-full')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_LISTING_DEAL_TYPES.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ListingField>

        <ListingField label="دسته ملک">
          <Select
            value={value.categorySlug ?? '_unset'}
            onValueChange={(v) => setCategory(v === '_unset' ? undefined : v)}
          >
            <SelectTrigger className={cn(FIELD_H, 'w-full')}>
              <SelectValue placeholder="انتخاب دسته" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_unset">انتخاب دسته</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ListingField>
      </div>

      <ListingField label="عنوان" required>
        <Input
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={config.titlePlaceholder}
          className={FIELD_H}
        />
      </ListingField>

      <ListingField label="محله">
        <ListingNeighborhoodPicker
          neighborhoodId={value.neighborhoodId}
          locationLabel={value.location}
          cityId={value.cityId}
          onChange={(patch) => onChange(patch)}
        />
      </ListingField>

      <AnimatePresence mode="wait" initial={false}>
        {categorySelected ? (
          <motion.div
            key={getListingFormProfile(value.categorySlug)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            <DynamicSpecs
              config={config}
              value={value}
              onChange={onChange}
              showStatus={showStatus}
            />
          </motion.div>
        ) : (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-dashed border-border/70 bg-muted/15 px-3 py-2.5 text-xs text-muted-foreground"
          >
            پس از انتخاب دسته، فیلدهای مخصوص همان نوع ملک (آپارتمان، زمین، صنعتی و…) نمایش داده
            می‌شود.
          </motion.p>
        )}
      </AnimatePresence>

      <ListingField label="توضیحات">
        <Textarea
          value={value.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          placeholder={config.descriptionPlaceholder}
          className="min-h-[4rem] resize-y bg-background text-sm"
        />
      </ListingField>
    </div>
  );
}

import type { IntentSchema, IntentType } from '@/contracts/need-intake';
import { getCategoryPath, isAncestorCategory } from '@/config/categories';
import { generalSchema } from './general';
import { buildPropertyIntakeSchema } from './property-intake';
import { buildVehicleIntakeSchema } from './vehicle-intake';
import { buildProductIntakeSchema } from './product-intake';
import { buildServicesIntakeSchema } from './services-intake';
import { buildJobsIntakeSchema } from './jobs-intake';
import { buildSocialIntakeSchema } from './social-intake';
import { buildPreSaleIntakeSchema } from './pre-sale-intake';

function isSocialCategory(categorySlug: string): boolean {
  return categorySlug === 'social' || isAncestorCategory('social', categorySlug);
}

function isPreSaleCategory(categorySlug: string): boolean {
  return (
    categorySlug === 'pre-sale-services' ||
    categorySlug.includes('pre-sale')
  );
}

function isRealEstateCategory(categorySlug: string): boolean {
  return (
    categorySlug === 'real-estate' ||
    isAncestorCategory('real-estate', categorySlug)
  );
}

function isVehicleCategory(categorySlug: string): boolean {
  return categorySlug === 'vehicles' || isAncestorCategory('vehicles', categorySlug);
}

function isProductCategory(categorySlug: string): boolean {
  const roots = ['electronics', 'home-appliances', 'personal-items', 'entertainment'] as const;
  return roots.some((r) => categorySlug === r || isAncestorCategory(r, categorySlug));
}

function isServicesCategory(categorySlug: string): boolean {
  return categorySlug === 'services' || isAncestorCategory('services', categorySlug);
}

function isJobsCategory(categorySlug: string): boolean {
  return categorySlug === 'jobs' || isAncestorCategory('jobs', categorySlug);
}

export function getSchemaForIntake(
  intentType: IntentType,
  categorySlug: string
): IntentSchema {
  if (intentType === 'real_estate_service') {
    return buildServicesIntakeSchema(intentType, categorySlug);
  }

  if (isPreSaleCategory(categorySlug)) {
    return buildPreSaleIntakeSchema(intentType);
  }

  if (isSocialCategory(categorySlug) || intentType === 'help_request') {
    return buildSocialIntakeSchema(intentType, categorySlug);
  }

  if (
    intentType === 'property_search' ||
    intentType === 'property_listing' ||
    isRealEstateCategory(categorySlug)
  ) {
    return buildPropertyIntakeSchema(intentType, categorySlug);
  }

  if (
    intentType === 'vehicle_search' ||
    intentType === 'vehicle_listing' ||
    intentType === 'vehicle_service' ||
    isVehicleCategory(categorySlug)
  ) {
    return buildVehicleIntakeSchema(intentType, categorySlug);
  }

  if (intentType === 'job_search' || isJobsCategory(categorySlug)) {
    return buildJobsIntakeSchema(intentType, categorySlug);
  }

  if (
    intentType === 'product_search' ||
    intentType === 'product_listing' ||
    isProductCategory(categorySlug)
  ) {
    return buildProductIntakeSchema(intentType, categorySlug);
  }

  if (
    intentType === 'service_request' ||
    intentType === 'booking' ||
    intentType === 'consultation' ||
    isServicesCategory(categorySlug)
  ) {
    return buildServicesIntakeSchema(intentType, categorySlug);
  }

  return generalSchema;
}

export function getRootCategorySlug(categorySlug: string): string {
  const path = getCategoryPath(categorySlug);
  return path[0]?.slug ?? categorySlug;
}

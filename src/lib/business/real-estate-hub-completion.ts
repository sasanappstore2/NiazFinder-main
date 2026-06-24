import type { PropertyListing } from '@/contracts/business-profile';
import type { RealEstateSubtype } from '@/lib/business/widget-registry';
import type { EcosystemExtension } from '@/lib/business/ecosystem/types';
import type { RealEstateHubTaskId } from './real-estate-hub-tasks';
import { isRealEstateListingSubtype } from '@/lib/business/real-estate-listing-subtypes';

export type RealEstateCompletionItemId =
  | 'name'
  | 'description'
  | 'brandImage'
  | 'contact'
  | 'serviceArea'
  | 'listings'
  | 'portfolio'
  | 'services'
  | 'specializations'
  | 'designStyles';

export type RealEstateCompletionItem = {
  id: RealEstateCompletionItemId;
  label: string;
  completed: boolean;
  taskId: RealEstateHubTaskId;
};

export type RealEstateCompletionResult = {
  percent: number;
  items: RealEstateCompletionItem[];
  nextTaskId: RealEstateHubTaskId | null;
};

export type RealEstateCompletionInput = {
  subtype: RealEstateSubtype;
  name: string;
  description: string;
  logo: string;
  coverImage: string;
  phone: string;
  whatsapp: string;
  tags: string[];
  listings: PropertyListing[];
  portfolioCount: number;
  offerCount: number;
  ecosystem: EcosystemExtension;
};

const DESCRIPTION_MIN = 40;

export function computeRealEstateHubCompletion(
  input: RealEstateCompletionInput
): RealEstateCompletionResult {
  const serviceAreaDone = (input.ecosystem.serviceArea?.areas?.length ?? 0) > 0;
  const specializationsDone = (input.ecosystem.specializations?.length ?? 0) > 0;
  const listingsDone = input.listings.length > 0;
  const portfolioDone = input.portfolioCount > 0;
  const offersDone = input.offerCount > 0;
  const designStylesDone = input.tags.some((t) => t.trim().length > 0);

  const items: RealEstateCompletionItem[] = [
    {
      id: 'name',
      label: 'نام کسب‌وکار',
      completed: input.name.trim().length >= 2,
      taskId: 'profile',
    },
    {
      id: 'description',
      label: 'معرفی کسب‌وکار',
      completed: input.description.trim().length >= DESCRIPTION_MIN,
      taskId: 'profile',
    },
    {
      id: 'brandImage',
      label: 'لوگو یا کاور',
      completed: Boolean(input.logo.trim() || input.coverImage.trim()),
      taskId: 'brand',
    },
    {
      id: 'contact',
      label: 'شماره تماس',
      completed: Boolean(input.phone.trim() || input.whatsapp.trim()),
      taskId: 'profile',
    },
    {
      id: 'serviceArea',
      label: 'محدوده خدمات',
      completed: serviceAreaDone,
      taskId: 'coverage',
    },
  ];

  if (isRealEstateListingSubtype(input.subtype)) {
    items.push(
      {
        id: 'listings',
        label: 'حداقل یک آگهی',
        completed: listingsDone,
        taskId: 'listings',
      },
      {
        id: 'specializations',
        label: 'تخصص‌های املاک',
        completed: specializationsDone,
        taskId: 'coverage',
      }
    );
  }

  if (input.subtype === 'architect') {
    items.push(
      {
        id: 'portfolio',
        label: 'نمونه‌کار معماری',
        completed: portfolioDone,
        taskId: 'portfolio',
      },
      {
        id: 'designStyles',
        label: 'سبک‌های طراحی',
        completed: designStylesDone,
        taskId: 'coverage',
      }
    );
  }

  if (input.subtype === 'interior-designer') {
    items.push(
      {
        id: 'portfolio',
        label: 'گالری نمونه‌کار',
        completed: portfolioDone,
        taskId: 'portfolio',
      },
      {
        id: 'services',
        label: 'پکیج یا خدمات',
        completed: offersDone,
        taskId: 'services',
      },
      {
        id: 'designStyles',
        label: 'نوع پروژه',
        completed: designStylesDone,
        taskId: 'coverage',
      }
    );
  }

  if (input.subtype === 'property-manager') {
    items.push({
      id: 'services',
      label: 'خدمات مدیریت ملک',
      completed: offersDone,
      taskId: 'services',
    });
  }

  if (
    !isRealEstateListingSubtype(input.subtype) &&
    input.subtype !== 'architect' &&
    input.subtype !== 'interior-designer' &&
    input.subtype !== 'property-manager'
  ) {
    items.push({
      id: 'portfolio',
      label: 'نمونه‌کار یا خدمات',
      completed: portfolioDone,
      taskId: 'portfolio',
    });
  }

  const completedCount = items.filter((i) => i.completed).length;
  const percent =
    items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100);
  const firstIncomplete = items.find((i) => !i.completed);

  return {
    percent,
    items,
    nextTaskId: firstIncomplete?.taskId ?? null,
  };
}

export function getIncompleteItemIdsForTask(
  completion: RealEstateCompletionResult | null,
  taskId: RealEstateHubTaskId
): RealEstateCompletionItemId[] {
  if (!completion) return [];
  return completion.items
    .filter((item) => !item.completed && item.taskId === taskId)
    .map((item) => item.id);
}

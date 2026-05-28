/**
 * Business profile completion checklist for /my-business hub.
 */

export type HubTaskId = 'storefront' | 'profile' | 'brand' | 'gallery';

export type CompletionItemId =
  | 'name'
  | 'category'
  | 'description'
  | 'brandImage'
  | 'contact'
  | 'catalogOrGallery'
  | 'webLink';

export type ProfileCompletionInput = {
  name: string;
  categorySlugs: string[];
  description: string;
  logo: string;
  coverImage: string;
  phone: string;
  whatsapp: string;
  website: string;
  instagram: string;
  telegram: string;
  bale: string;
  rubika: string;
  eitaa: string;
  offerCount: number;
  portfolioCount: number;
};

export type ProfileCompletionItem = {
  id: CompletionItemId;
  label: string;
  completed: boolean;
  taskId: HubTaskId;
};

export type ProfileCompletionResult = {
  percent: number;
  items: ProfileCompletionItem[];
  nextTaskId: HubTaskId | null;
};

const DESCRIPTION_MIN = 20;

function hasWebLink(input: ProfileCompletionInput): boolean {
  return [input.website, input.instagram, input.telegram, input.bale, input.rubika, input.eitaa].some(
    (v) => v.trim().length > 0
  );
}

export function computeBusinessProfileCompletion(
  input: ProfileCompletionInput
): ProfileCompletionResult {
  const items: ProfileCompletionItem[] = [
    {
      id: 'name',
      label: 'نام کسب‌وکار',
      completed: input.name.trim().length >= 2,
      taskId: 'profile',
    },
    {
      id: 'category',
      label: 'انتخاب حوزه کاری',
      completed: input.categorySlugs.length > 0,
      taskId: 'storefront',
    },
    {
      id: 'description',
      label: 'معرفی کوتاه',
      completed: input.description.trim().length >= DESCRIPTION_MIN,
      taskId: 'profile',
    },
    {
      id: 'brandImage',
      label: 'عکس پروفایل یا کاور',
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
      id: 'catalogOrGallery',
      label: 'حداقل یک محصول یا نمونه کار',
      completed: input.offerCount >= 1 || input.portfolioCount >= 1,
      taskId: input.offerCount >= 1 ? 'storefront' : 'gallery',
    },
    {
      id: 'webLink',
      label: 'وب‌سایت یا شبکه اجتماعی',
      completed: hasWebLink(input),
      taskId: 'brand',
    },
  ];

  const completedCount = items.filter((i) => i.completed).length;
  const percent =
    items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100);

  const firstIncomplete = items.find((i) => !i.completed);
  const nextTaskId = firstIncomplete?.taskId ?? null;

  return { percent, items, nextTaskId };
}

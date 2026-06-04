export const MAX_BUSINESS_CONTACT_POINTS = 8;
export const MAX_BUSINESS_MEMBERS = 15;
export const BUSINESS_INVITE_TTL_DAYS = 7;

export const CONTACT_POINT_PRESETS = [
  { label: 'فروش', slug: 'sales', description: 'استعلام قیمت و سفارش' },
  { label: 'پشتیبانی', slug: 'support', description: 'سوالات فنی و گارانتی' },
  { label: 'سفارشات', slug: 'orders', description: 'پیگیری سفارش و تحویل' },
] as const;

import type { Business, OfferCtaType } from '@/contracts/business-profile';

export type SectionProps = {
  business: Business;
  requestId?: string;
  onOfferAction?: (offerId: string, cta: OfferCtaType) => void;
};

export const CTA_LABEL: Record<OfferCtaType, string> = {
  book: 'رزرو',
  quote: 'استعلام',
  call: 'تماس',
  chat: 'گفتگو',
};

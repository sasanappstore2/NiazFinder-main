import { DEED_TYPE } from '@/config/category-filters/options';
import {
  isListingRentDeal,
  isListingSaleDeal,
  isListingShortTermDeal,
  normalizeListingDealType,
  type PropertyListingDealTypeStored,
} from '@/lib/business/real-estate-listing-deal-types';
import { isShortTermListingCategory } from '@/lib/business/real-estate-listing-categories';

export type ListingFormProfile = 'built' | 'land' | 'industrial' | 'short-term';

export type ListingFormConfig = {
  profile: ListingFormProfile;
  showRooms: boolean;
  showFloor: boolean;
  showDeedType: boolean;
  showPricePerMeter: boolean;
  showPlotWidth: boolean;
  showPrice: boolean;
  showDeposit: boolean;
  showMonthlyRent: boolean;
  priceLabel: string;
  depositLabel: string;
  monthlyRentLabel: string;
  areaLabel: string;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  deedOptions: readonly { value: string; label: string }[];
};

export function getListingFormProfile(categorySlug?: string): ListingFormProfile {
  if (!categorySlug) return 'built';
  if (categorySlug.startsWith('land-')) return 'land';
  if (categorySlug.startsWith('industrial-')) return 'industrial';
  if (isShortTermListingCategory(categorySlug)) return 'short-term';
  return 'built';
}

export function getListingFormConfig(
  categorySlug: string | undefined,
  dealType: PropertyListingDealTypeStored = 'sell'
): ListingFormConfig {
  const profile = getListingFormProfile(categorySlug);
  const normalized = normalizeListingDealType(dealType);
  const isSale = isListingSaleDeal(dealType);
  const isShortTerm = isListingShortTermDeal(dealType) || profile === 'short-term';
  const isRahnFull = normalized === 'rent_rahn_full';
  const isRahnEjare = normalized === 'rent_rahn_ejare';
  const isRent = isListingRentDeal(dealType);

  const rentPriceFields = {
    showPrice: false,
    showDeposit: isRent,
    showMonthlyRent: isRahnEjare,
    depositLabel: isRahnFull ? 'مبلغ رهن کامل' : 'ودیعه (رهن)',
    monthlyRentLabel: 'اجاره ماهانه',
  };

  if (profile === 'land') {
    return {
      profile,
      showRooms: false,
      showFloor: false,
      showDeedType: isSale,
      showPricePerMeter: false,
      showPlotWidth: isSale,
      showPrice: isSale,
      showDeposit: isRent && !isShortTerm,
      showMonthlyRent: isRahnEjare,
      priceLabel: 'قیمت کل',
      depositLabel: isRahnFull ? 'مبلغ رهن کامل' : 'ودیعه (رهن)',
      monthlyRentLabel: 'اجاره ماهانه',
      areaLabel: 'متراژ زمین',
      titlePlaceholder: isSale ? 'زمین ۳۰۰ متری کلنگی' : 'زمین مسکونی ۲۰۰ متری',
      descriptionPlaceholder: 'کاربری، بر، ابعاد، دسترسی...',
      deedOptions: DEED_TYPE,
    };
  }

  if (profile === 'industrial') {
    return {
      profile,
      showRooms: false,
      showFloor: false,
      showDeedType: false,
      showPricePerMeter: isSale,
      showPlotWidth: false,
      showPrice: isSale,
      showDeposit: isRent && !isShortTerm,
      showMonthlyRent: isRahnEjare,
      priceLabel: 'قیمت کل',
      depositLabel: 'ودیعه / رهن',
      monthlyRentLabel: 'اجاره ماهانه',
      areaLabel: 'متراژ',
      titlePlaceholder: 'سوله ۸۰۰ متری صنعتی',
      descriptionPlaceholder: 'ارتفاع سقف، برق، بارگیری...',
      deedOptions: DEED_TYPE,
    };
  }

  if (isShortTerm) {
    return {
      profile: 'short-term',
      showRooms: true,
      showFloor: false,
      showDeedType: false,
      showPricePerMeter: false,
      showPlotWidth: false,
      showPrice: true,
      showDeposit: false,
      showMonthlyRent: false,
      priceLabel: 'اجاره روزانه / شبانه',
      depositLabel: 'ودیعه',
      monthlyRentLabel: 'اجاره',
      areaLabel: 'متراژ',
      titlePlaceholder: 'سوئیت مبله نزدیک حرم',
      descriptionPlaceholder: 'ظرفیت، امکانات، حداقل اقامت...',
      deedOptions: DEED_TYPE,
    };
  }

  return {
    profile: 'built',
    showRooms: true,
    showFloor: true,
    showDeedType: isSale,
    showPricePerMeter: false,
    showPlotWidth: false,
    ...rentPriceFields,
    showPrice: isSale,
    priceLabel: 'قیمت کل (فروش)',
    areaLabel: 'متراژ',
    titlePlaceholder: isSale ? 'آپارتمان ۱۲۰ متری نوساز' : 'آپارتمان ۹۰ متری دو خواب',
    descriptionPlaceholder: isSale
      ? 'طبقه، پارکینگ، سال ساخت، امکانات...'
      : 'طبقه، پارکینگ، انباری، تاریخ تحویل...',
    deedOptions: DEED_TYPE,
  };
}

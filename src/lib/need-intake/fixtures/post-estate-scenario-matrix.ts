/**
 * Post /post estate scenario matrix — rules + LRE path (no V2 chat).
 */
import type { IntakeAnalysisResult } from '@/intake/types';

export interface PostEstateScenario {
  id: string;
  text: string;
  preferredCitySlug?: string;
  preferredCityName?: string;
  assert: (result: IntakeAnalysisResult) => string | null;
}

export const POST_ESTATE_SCENARIO_MATRIX: PostEstateScenario[] = [
  {
    id: 'mashhad-sajjad-land',
    text: 'من یک زمین ۲۵۰ متری با پروانه ساخت لازم دارم در منطقه سجاد',
    preferredCityName: 'مشهد',
    assert: (r) => {
      if (r.entities.transactionType !== 'BUY') return `tx=${r.entities.transactionType}`;
      const catSlug = r.entities.subcategorySlug ?? r.entities.categorySlug ?? '';
      if (!catSlug.includes('land')) return `slug=${catSlug}`;
      const hoodSlug = r.locationHints?.neighborhoodSlug ?? r.entities.neighborhoodSlug;
      if (hoodSlug !== 'سجاد-شهر') return `hood=${hoodSlug}`;
      return null;
    },
  },
  {
    id: 'mashhad-faramez',
    text: 'آپارتمان در فرامرز عباسی مشهد اجاره',
    assert: (r) => {
      if (r.entities.city !== 'مشهد') return `city=${r.entities.city}`;
      const area = r.entities.neighborhood ?? r.locationHints?.areaLabel ?? '';
      if (!/فرامرز/.test(area)) return `area=${area}`;
      return null;
    },
  },
  {
    id: 'mashhad-kohesangi',
    text: 'آپارتمان در کوهسنگی مشهد اجاره',
    assert: (r) => {
      if (r.entities.city !== 'مشهد') return `city=${r.entities.city}`;
      const slug = r.locationHints?.neighborhoodSlug ?? r.entities.neighborhoodSlug ?? '';
      const hood = r.entities.neighborhood ?? '';
      if (!/کوه|سنگی/.test(`${slug}${hood}`)) {
        return `hood missing (${slug})`;
      }
      return null;
    },
  },
  {
    id: 'mashhad-jalal',
    text: 'من یک آپارتمان ۱۳۰ متری در جلال آل احمد میخوام',
    preferredCityName: 'مشهد',
    assert: (r) => {
      const area = r.entities.neighborhood ?? r.locationHints?.areaLabel ?? '';
      if (!/جلال/.test(area)) return `area=${area}`;
      if (r.entities.area !== 130) return `areaM2=${r.entities.area}`;
      return null;
    },
  },
  {
    id: 'mashhad-nesteran',
    text: 'اپارتمان ۱۹۶ متری در خیابان نسترن ملک آباد مشهد',
    assert: (r) => {
      if (r.entities.city !== 'مشهد') return `city=${r.entities.city}`;
      const hood = r.entities.neighborhood ?? r.locationHints?.areaLabel ?? '';
      if (!/نسترن|ملک/.test(hood)) return `hood=${hood}`;
      return null;
    },
  },
  {
    id: 'tehran-vanak-rent',
    text: 'آپارتمان دو خواب در ونک تهران برای اجاره',
    assert: (r) => {
      if (r.entities.city !== 'تهران') return `city=${r.entities.city}`;
      if (r.entities.transactionType !== 'RENT') return `tx=${r.entities.transactionType}`;
      return null;
    },
  },
  {
    id: 'tehran-azadi-ambiguous',
    text: 'آپارتمان در خیابان آزادی',
    assert: (r) => {
      const ambiguous =
        r.locationHints?.locationAmbiguous === true ||
        r.locationHints?.rejectLocationAutoConfirm === true ||
        (r.locationHints?.neighborhoodCandidates?.length ?? 0) > 0;
      if (!ambiguous && r.entities.neighborhoodSlug) return 'generic street auto-resolved';
      return null;
    },
  },
  {
    id: 'isfahan-smoke',
    text: 'آپارتمان خرید در چهارباغ اصفهان',
    assert: (r) => {
      if (r.entities.city !== 'اصفهان') return `city=${r.entities.city}`;
      if (r.entities.transactionType !== 'BUY') return `tx=${r.entities.transactionType}`;
      return null;
    },
  },
  {
    id: 'shiraz-smoke',
    text: 'ویلا اجاره در شیراز',
    assert: (r) => {
      if (r.entities.city !== 'شیراز') return `city=${r.entities.city}`;
      if (r.entities.transactionType !== 'RENT') return `tx=${r.entities.transactionType}`;
      return null;
    },
  },
  {
    id: 'deal-buy',
    text: 'آپارتمان در مشهد خرید می‌خوام',
    assert: (r) =>
      r.entities.transactionType === 'BUY' ? null : `tx=${r.entities.transactionType}`,
  },
  {
    id: 'deal-rent',
    text: 'آپارتمان در مشهد اجاره',
    assert: (r) =>
      r.entities.transactionType === 'RENT' ? null : `tx=${r.entities.transactionType}`,
  },
  {
    id: 'deal-rahn-full',
    text: 'آپارتمان در ونک تهران رهن کامل',
    assert: (r) =>
      r.entities.transactionType === 'FULL_DEPOSIT'
        ? null
        : `tx=${r.entities.transactionType}`,
  },
  {
    id: 'deal-rahn-ejare',
    text: 'مغازه در مشهد رهن و اجاره',
    assert: (r) =>
      r.entities.transactionType === 'DEPOSIT_AND_RENT'
        ? null
        : `tx=${r.entities.transactionType}`,
  },
  {
    id: 'edge-130-not-deposit',
    text: 'آپارتمان ۱۳۰ متری در تهران',
    assert: (r) => {
      if (r.entities.area !== 130) return `area=${r.entities.area}`;
      if (r.entities.budgetMax != null && r.entities.budgetMax < 500_000_000) {
        return `budget looks like area: ${r.entities.budgetMax}`;
      }
      return null;
    },
  },
  {
    id: 'edge-parvaneh-land',
    text: 'زمین با پروانه ساخت در مشهد',
    assert: (r) => {
      const slug = r.entities.subcategorySlug ?? r.entities.categorySlug ?? '';
      if (!slug.includes('land')) return `slug=${slug}`;
      if (r.entities.transactionType === 'RENT') return 'land marked rent';
      return null;
    },
  },
  {
    id: 'mashhad-shop-faramez',
    text: 'مغازه در فرامرز عباسی مشهد می‌خوام',
    assert: (r) => {
      if (r.entities.city !== 'مشهد') return `city=${r.entities.city}`;
      const slug = r.entities.categorySlug ?? '';
      if (!slug.includes('shop') && !slug.includes('commercial')) {
        return `category=${slug}`;
      }
      return null;
    },
  },
  {
    id: 'tehran-west-budget',
    text: 'آپارتمان دو خواب رهن کامل غرب تهران تا ۲ میلیارد',
    assert: (r) => {
      if (r.entities.city !== 'تهران') return `city=${r.entities.city}`;
      if (r.entities.transactionType !== 'FULL_DEPOSIT') return `tx=${r.entities.transactionType}`;
      if (!r.entities.budgetMax || r.entities.budgetMax < 1_500_000_000) {
        return `budget=${r.entities.budgetMax}`;
      }
      return null;
    },
  },
  {
    id: 'mashhad-office',
    text: 'واحد اداری تجاری در مشهد اجاره',
    assert: (r) => {
      if (r.entities.city !== 'مشهد') return `city=${r.entities.city}`;
      if (r.entities.transactionType !== 'RENT') return `tx=${r.entities.transactionType}`;
      return null;
    },
  },
  {
    id: 'mashhad-villa-rent',
    text: 'ویلا در مشهد اجاره',
    assert: (r) => {
      const slug = r.entities.subcategorySlug ?? r.entities.categorySlug ?? '';
      if (!slug.includes('villa')) return `slug=${slug}`;
      return null;
    },
  },
  {
    id: 'mashhad-ahmadabad',
    text: 'آپارتمان در احمدآباد مشهد',
    assert: (r) => {
      if (r.entities.city !== 'مشهد') return `city=${r.entities.city}`;
      return null;
    },
  },
  {
    id: 'mashhad-sajjad-city-hint',
    text: 'زمین در سجاد',
    preferredCitySlug: 'mashhad',
    preferredCityName: 'مشهد',
    assert: (r) => {
      if (r.entities.city !== 'مشهد') return `city=${r.entities.city}`;
      const slug = r.entities.subcategorySlug ?? r.entities.categorySlug ?? '';
      if (!slug.includes('land')) return `slug=${slug}`;
      return null;
    },
  },
  {
    id: 'tehran-sale',
    text: 'آپارتمان فروش در تهران',
    assert: (r) => {
      if (r.entities.transactionType !== 'BUY' && r.entities.transactionType !== 'SELL') {
        return `tx=${r.entities.transactionType}`;
      }
      return null;
    },
  },
  {
    id: 'mashhad-rahn-full',
    text: 'آپارتمان رهن کامل در کوهسنگی مشهد',
    assert: (r) =>
      r.entities.transactionType === 'FULL_DEPOSIT'
        ? null
        : `tx=${r.entities.transactionType}`,
  },
  {
    id: 'mashhad-two-bedroom',
    text: 'آپارتمان دو خواب در مشهد اجاره',
    assert: (r) => {
      if (r.entities.rooms !== 2) return `rooms=${r.entities.rooms}`;
      return null;
    },
  },
  {
    id: 'real-estate-vertical',
    text: 'به دنبال آپارتمان ۶۰ تا ۷۰ متری دو خواب در منطقه ونک برای اجاره',
    assert: (r) => {
      if (r.entities.vertical !== 'real-estate') return `vertical=${r.entities.vertical}`;
      if (!r.entities.categorySlug) return 'missing categorySlug';
      return null;
    },
  },
];

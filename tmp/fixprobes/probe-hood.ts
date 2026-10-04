import { resolveTextNeighborhoodInCity } from '@/lib/need-intake/resolve-text-neighborhood';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';

function loadCity(slug: string): ManagedNeighborhood[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const data = require(`@/../src/data/neighborhoods/catalog/${slug}.json`);
  return data.neighborhoods as ManagedNeighborhood[];
}

function show(label: string, slug: string, cityName: string, text: string) {
  const hoods = loadCity(slug);
  const r = resolveTextNeighborhoodInCity(hoods, text, cityName);
  console.log(label, JSON.stringify({
    hit: r.hit?.id ?? null,
    candidates: r.candidates.map((c) => c.id).slice(0, 6),
  }));
}

// bucket 8: bare mention without spatial cue
show('bare-yafte:', 'tehran-city', 'تهران', '۹۸ متر آپارتمان میخوام یافت آباد شمالی، ۱۲۴۷ میلیون رهن ۶۵ میلیون اجاره');
show('bare-kuy-shaghayegh:', 'ghahderijaan', 'قهدریجان', 'من یک آپارتمان ۱۵۵ متر  کوی شقایق دنبالش هستم ۱۱۹۳ میلیون رهن دارم ۷۱ میلیون اجاره');
show('bare-mehran:', 'tehran-city', 'تهران', 'دفتر کار اداری ۳۶۸ متر مهران دنبالش هستم رهن 410 میلیون و اجاره 167 میلیون تومن');
show('bare-shohada-university:', 'urmia', 'ارومیه', 'خرید خانه و ویلا  شهرک دانشگاه با بودجه تا ۷۹۵۶۷ میلیون');

// bucket 10: hood label equal to the selected city name
show('alias-moran-cue:', 'moran', 'موران', '103 متر آپارتمان دنبالم محدوده موران، ۸۰ میلیون رهن ۹۹ میلیون اجاره');
show('alias-goharkuh-repeat:', 'goharkuh', 'گوهرکوه', 'زمین 1309 متر گوهرکوه گوهرکوه برای خرید، بودجه 40588 میلیون');
show('alias-benaruyeh-repeat:', 'banaruyeh', 'بنارویه', 'مغازه ۴۰ متر متری  بنارویه بنارویه رهن ۷۹۲ میلیون اجارهٔ ماهانه 208 میلیون');

// bucket 9: compound label hijack
show('compound-hafez:', 'mashhad', 'مشهد', 'خرید خانه و ویلا تقاطع غیر همسطح حافظ مشهد با بودجه تا 31792 میلیون تومان');
show('compound-janbaz:', 'mashhad', 'مشهد', 'دفتر کار اداری ۱۸۳ متر حوالی جانباز ششم مشهد دنبالم رهن ۱۵۷۹ میلیون و اجاره ۱۸۱ میلیون');
show('compound-abuzar:', 'tehran-city', 'تهران', 'مغازه 195 متر متری تو ابوذر شرقی تهران رهن 1121 میلیون اجارهٔ ماهانه ۱۳۴ میلیون');
show('compound-kuy-nasr:', 'tehran-city', 'تهران', 'دفتر کار اداری 168 متر در کوی نصر مهرآباد تهران میخوام رهن ۲۳۷۶ میلیون و اجاره ۳۱ میلیون تومن');
show('compound-ekhtiyariyeh:', 'tehran-city', 'تهران', 'من یک آپارتمان 191 متر نزدیک میدان اختیاریه تهران نیاز مندم ۱۴۳۹ میلیون رهن دارم 13 میلیون اجاره');
show('compound-daneshgah-tehran:', 'tehran-city', 'تهران', '196 متر آپارتمان میخوام  شهرک دانشگاه تهران، ۱۲۲۴ میلیون رهن 66 میلیون اجاره');

// same-span canonical + area → candidates, not exclusive hit
show('span-vanak:', 'tehran-city', 'تهران', 'آپارتمان ۱۵۷ متر توی ونک تهران رهن کامل 1093 میلیون اجاره ندارم');
show('span-vahid:', 'mashhad', 'مشهد', 'مغازه ۷۹ متر متری وحید مشهد رهن ۶۸۷ میلیون اجارهٔ ماهانه ۷۹ میلیون تومان');
show('span-motahhari:', 'karaj', 'کرج', 'خرید خانه و ویلا مطهری کرج با بودجه تا ۳۶۶۷۴ میلیون');

// cued mentions must keep working
show('cued-safaiyeh:', 'tehran-city', 'تهران', 'آپارتمان ۱۵۶ متر توی صفائیه (چشمه علی) رهن کامل ۳۶۵۶ میلیون اجاره ندارم');
show('cued-navab:', 'tehran-city', 'تهران', '۱۶۲ متر آپارتمان نیاز مندم حوالی نواب، ۳۱۰ میلیون رهن ۷۳ میلیون اجاره');

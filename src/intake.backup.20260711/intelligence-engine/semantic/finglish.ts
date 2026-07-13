/**
 * Lightweight Finglish (Persian-in-Latin) → Persian normalizer for embedding.
 *
 * bge-m3 aligns Persian queries with Persian exemplars well, but Finglish
 * ("mikham ye khune villayi bekharam") matches poorly. We detect Latin-heavy
 * input and convert it: a high-frequency word dictionary (carries most of the
 * signal) plus a phonetic digraph fallback for unknown words.
 */

const WORD_MAP: Record<string, string> = {
  // intents
  mikham: 'می‌خوام', mikhaam: 'می‌خوام', mikhastam: 'می‌خواستم',
  mikhaham: 'می‌خواهم', khastam: 'خواستم', donbal: 'دنبال', donbale: 'دنبال',
  niaz: 'نیاز', niazmand: 'نیازمند', lazem: 'لازم', lazm: 'لازم', joya: 'جویا',
  // deal types
  kharid: 'خرید', kharidan: 'خرید', kharide: 'خرید', bekharam: 'بخرم', bexaram: 'بخرم',
  forush: 'فروش', foroush: 'فروش', foroosh: 'فروش', mifrusham: 'می‌فروشم', mifroosham: 'می‌فروشم',
  foroshi: 'فروشی', ejare: 'اجاره', ejareh: 'اجاره', ejarei: 'اجاره‌ای', rahn: 'رهن',
  keraye: 'کرایه', kraye: 'کرایه', tamir: 'تعمیر', tamire: 'تعمیر', kharab: 'خراب',
  kharabe: 'خراب شده', service: 'سرویس',
  // real estate
  khune: 'خانه', khoone: 'خانه', khane: 'خانه', villa: 'ویلا', villayi: 'ویلایی', vila: 'ویلا',
  zamin: 'زمین', kolangi: 'کلنگی', kol: 'کلنگی', apartman: 'آپارتمان', apartemos: 'آپارتمان',
  apartemon: 'آپارتمان', apartement: 'آپارتمان', vahed: 'واحد', maghaze: 'مغازه', ghorfe: 'غرفه',
  daftar: 'دفتر', soole: 'سوله', kargah: 'کارگاه', edari: 'اداری', tejari: 'تجاری', sanati: 'صنعتی',
  hayatdar: 'حیاط‌دار', hayat: 'حیاط', metr: 'متر', metri: 'متری', tabaghe: 'طبقه',
  suite: 'سوئیت', rooz: 'روز', roozane: 'روزانه',
  // vehicles
  mashin: 'ماشین', khodro: 'خودرو', khodroo: 'خودرو', pezho: 'پژو', peugeot: 'پژو', pride: 'پراید',
  motor: 'موتور', motorsiklet: 'موتورسیکلت', dochrkhe: 'دوچرخه', ghayegh: 'قایق', savari: 'سواری',
  // electronics / appliances
  gushi: 'گوشی', gooshi: 'گوشی', mobile: 'موبایل', mobyle: 'موبایل', ayfun: 'آیفون', iphone: 'آیفون',
  laptop: 'لپ‌تاپ', laptap: 'لپ‌تاپ', tablet: 'تبلت', console: 'کنسول', durbin: 'دوربین',
  yakhchal: 'یخچال', yakhchall: 'یخچال', freezer: 'فریزر', lebasshui: 'لباسشویی',
  zarfshui: 'ظرفشویی', kooler: 'کولر', koler: 'کولر', gazi: 'گازی', esplit: 'اسپلیت',
  televizion: 'تلویزیون', tv: 'تلویزیون', mobl: 'مبل', mobel: 'مبلمان', farsh: 'فرش',
  // services
  lule: 'لوله', lulekeshi: 'لوله‌کشی', barghkar: 'برق‌کار', bargh: 'برق', naghashi: 'نقاشی',
  nezafat: 'نظافت', asbabkeshi: 'اسباب‌کشی', barbari: 'باربری', amuzesh: 'آموزش', moalem: 'معلم',
  // jobs
  estekhdam: 'استخدام', barnamenevis: 'برنامه‌نویس', hesabdar: 'حسابدار', mohandes: 'مهندس',
  // modifiers
  no: 'نو', dast: 'دست', dovom: 'دوم', dovvom: 'دوم', tamiz: 'تمیز', darbast: 'دربست',
  // cities
  tehran: 'تهران', mashhad: 'مشهد', mashad: 'مشهد', esfahan: 'اصفهان', isfahan: 'اصفهان',
  shiraz: 'شیراز', tabriz: 'تبریز', karaj: 'کرج', ahvaz: 'اهواز', ahwaz: 'اهواز', qom: 'قم',
  rasht: 'رشت', kish: 'کیش',
  // fillers
  salam: 'سلام', ye: 'یه', yek: 'یک', too: 'تو', tu: 'تو', dar: 'در', baraye: 'برای',
  vase: 'واسه', ba: 'با', ke: 'که', hast: 'هست', hastam: 'هستم', daram: 'دارم',
};

const DIGRAPHS: Array<[RegExp, string]> = [
  [/kh/g, 'خ'], [/gh/g, 'ق'], [/ch/g, 'چ'], [/sh/g, 'ش'], [/zh/g, 'ژ'],
  [/aa/g, 'ا'], [/oo/g, 'و'], [/ou/g, 'و'], [/ee/g, 'ی'], [/th/g, 'ت'], [/ph/g, 'ف'],
];
const LETTERS: Record<string, string> = {
  a: 'ا', b: 'ب', c: 'ک', d: 'د', e: 'ه', f: 'ف', g: 'گ', h: 'ه', i: 'ی', j: 'ج',
  k: 'ک', l: 'ل', m: 'م', n: 'ن', o: 'و', p: 'پ', q: 'ق', r: 'ر', s: 'س', t: 'ت',
  u: 'و', v: 'و', w: 'و', x: 'خ', y: 'ی', z: 'ز',
};

export function looksFinglish(text: string): boolean {
  const latin = (text.match(/[a-z]/gi) ?? []).length;
  const persian = (text.match(/[؀-ۿ]/g) ?? []).length;
  return latin >= 4 && latin > persian;
}

function transliterateWord(w: string): string {
  const lower = w.toLowerCase();
  if (WORD_MAP[lower]) return WORD_MAP[lower];
  if (!/[a-z]/i.test(w)) return w; // numbers / already Persian
  let out = lower;
  for (const [re, fa] of DIGRAPHS) out = out.replace(re, fa);
  out = out.replace(/[a-z]/g, (ch) => LETTERS[ch] ?? '');
  return out || w;
}

export function transliterateFinglish(text: string): string {
  return text
    .split(/(\s+)/)
    .map((tok) => (/\s+/.test(tok) ? tok : tok.split(/([،.,!?؛:()«»"'/-]+)/).map(transliterateWord).join('')))
    .join('');
}

/** Returns Persian text for embedding; transliterates only Latin-heavy input. */
export function normalizeForEmbedding(text: string): string {
  return looksFinglish(text) ? transliterateFinglish(text) : text;
}

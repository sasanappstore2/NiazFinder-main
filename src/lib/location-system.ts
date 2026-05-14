// Location system interfaces
export interface City {
  id: string;
  name: string;
  nameEn: string;
}

export interface Province {
  id: string;
  name: string;
  nameEn: string;
  cities: City[];
}

export interface Country {
  id: string;
  name: string;
  nameEn: string;
  provinces: Province[];
}

// Iran-focused location data with comprehensive provinces and cities
export const countries: Country[] = [
  {
    id: 'iran',
    name: 'ایران',
    nameEn: 'Iran',
    provinces: [
      {
        id: 'tehran',
        name: 'تهران',
        nameEn: 'Tehran',
        cities: [
          { id: 'tehran-city', name: 'تهران', nameEn: 'Tehran' },
          { id: 'karaj', name: 'کرج', nameEn: 'Karaj' },
          { id: 'varamin', name: 'ورامین', nameEn: 'Varamin' },
          { id: 'shahriar', name: 'شهریار', nameEn: 'Shahriar' },
          { id: 'malard', name: 'ملارد', nameEn: 'Malard' },
          { id: 'firouzkouh', name: 'فیروزکوه', nameEn: 'Firouzkouh' },
          { id: 'damavand', name: 'دماوند', nameEn: 'Damavand' },
          { id: 'rey', name: 'ری', nameEn: 'Rey' },
          { id: 'islamshahr', name: 'اسلامشهر', nameEn: 'Islamshahr' },
          { id: 'baharestan', name: 'بهارستان', nameEn: 'Baharestan' },
          { id: 'pakdasht', name: 'پاکدشت', nameEn: 'Pakdasht' },
          { id: 'robat-karim', name: 'رباط‌کریم', nameEn: 'Robat Karim' },
        ],
      },
      {
        id: 'isfahan',
        name: 'اصفهان',
        nameEn: 'Isfahan',
        cities: [
          { id: 'isfahan-city', name: 'اصفهان', nameEn: 'Isfahan' },
          { id: 'kashan', name: 'کاشان', nameEn: 'Kashan' },
          { id: 'najafabad', name: 'نجف‌آباد', nameEn: 'Najafabad' },
          { id: 'khomeini-shahr', name: 'خمینی‌شهر', nameEn: 'Khomeini Shahr' },
          { id: 'shahin-shahr', name: 'شاهین‌شهر', nameEn: 'Shahin Shahr' },
          { id: 'mobarakeh', name: 'مبارکه', nameEn: 'Mobarakeh' },
          { id: 'falavarjan', name: 'فلاورجان', nameEn: 'Falavarjan' },
          { id: 'lenjan', name: 'لنجان', nameEn: 'Lenjan' },
        ],
      },
      {
        id: 'fars',
        name: 'فارس',
        nameEn: 'Fars',
        cities: [
          { id: 'shiraz', name: 'شیراز', nameEn: 'Shiraz' },
          { id: 'kazerun', name: 'کازرون', nameEn: 'Kazerun' },
          { id: 'marvdasht', name: 'مرودشت', nameEn: 'Marvdasht' },
          { id: 'jahrom', name: 'جهرم', nameEn: 'Jahrom' },
          { id: 'fasa', name: 'فسا', nameEn: 'Fasa' },
          { id: 'darab', name: 'داراب', nameEn: 'Darab' },
          { id: 'larestan', name: 'لارستان', nameEn: 'Larestan' },
        ],
      },
      {
        id: 'khorasan-razavi',
        name: 'خراسان رضوی',
        nameEn: 'Khorasan Razavi',
        cities: [
          { id: 'mashhad', name: 'مشهد', nameEn: 'Mashhad' },
          { id: 'nishapur', name: 'نیشابور', nameEn: 'Nishapur' },
          { id: 'sabzevar', name: 'سبزوار', nameEn: 'Sabzevar' },
          { id: 'kashmar', name: 'کاشمر', nameEn: 'Kashmar' },
          { id: 'torbat-heydariyeh', name: 'تربت حیدریه', nameEn: 'Torbat Heydariyeh' },
          { id: 'gonabad', name: 'گناباد', nameEn: 'Gonabad' },
        ],
      },
      {
        id: 'east-azerbaijan',
        name: 'آذربایجان شرقی',
        nameEn: 'East Azerbaijan',
        cities: [
          { id: 'tabriz', name: 'تبریز', nameEn: 'Tabriz' },
          { id: 'maragheh', name: 'مراغه', nameEn: 'Maragheh' },
          { id: 'mianeh', name: 'میانه', nameEn: 'Mianeh' },
          { id: 'shabestar', name: 'شبستر', nameEn: 'Shabestar' },
          { id: 'marand', name: 'مرند', nameEn: 'Marand' },
          { id: 'bonab', name: 'بناب', nameEn: 'Bonab' },
        ],
      },
      {
        id: 'west-azerbaijan',
        name: 'آذربایجان غربی',
        nameEn: 'West Azerbaijan',
        cities: [
          { id: 'urmia', name: 'ارومیه', nameEn: 'Urmia' },
          { id: 'khoy', name: 'خوی', nameEn: 'Khoy' },
          { id: 'mahabad', name: 'مهاباد', nameEn: 'Mahabad' },
          { id: 'sardasht', name: 'سردشت', nameEn: 'Sardasht' },
          { id: 'piranshahr', name: 'پیرانشهر', nameEn: 'Piranshahr' },
        ],
      },
      {
        id: 'kerman',
        name: 'کرمان',
        nameEn: 'Kerman',
        cities: [
          { id: 'kerman-city', name: 'کرمان', nameEn: 'Kerman' },
          { id: 'jiroft', name: 'جیرفت', nameEn: 'Jiroft' },
          { id: 'bam', name: 'بم', nameEn: 'Bam' },
          { id: 'sirjan', name: 'سیرجان', nameEn: 'Sirjan' },
          { id: 'shahdad', name: 'شهداد', nameEn: 'Shahdad' },
        ],
      },
      {
        id: 'gilan',
        name: 'گیلان',
        nameEn: 'Gilan',
        cities: [
          { id: 'rasht', name: 'رشت', nameEn: 'Rasht' },
          { id: 'bandar-anzali', name: 'بندر انزلی', nameEn: 'Bandar Anzali' },
          { id: 'lahijan', name: 'لاهیجان', nameEn: 'Lahijan' },
          { id: 'langrud', name: 'لنگرود', nameEn: 'Langrud' },
          { id: 'fouman', name: 'فومن', nameEn: 'Fouman' },
          { id: 'astara', name: 'آستارا', nameEn: 'Astara' },
        ],
      },
      {
        id: 'mazandaran',
        name: 'مازندران',
        nameEn: 'Mazandaran',
        cities: [
          { id: 'sari', name: 'ساری', nameEn: 'Sari' },
          { id: 'babol', name: 'بابل', nameEn: 'Babol' },
          { id: 'amol', name: 'آمل', nameEn: 'Amol' },
          { id: 'qaemshahr', name: 'قائم‌شهر', nameEn: 'Qaemshahr' },
          { id: 'behshahr', name: 'بهشهر', nameEn: 'Behshahr' },
          { id: 'chalus', name: 'چالوس', nameEn: 'Chalus' },
          { id: 'nowshahr', name: 'نوشهر', nameEn: 'Nowshahr' },
        ],
      },
      {
        id: 'qom',
        name: 'قم',
        nameEn: 'Qom',
        cities: [
          { id: 'qom-city', name: 'قم', nameEn: 'Qom' },
          { id: 'kahak', name: 'کهک', nameEn: 'Kahak' },
          { id: 'salafchegan', name: 'سلفچگان', nameEn: 'Salafchegan' },
          { id: 'ghanavat', name: 'قنوات', nameEn: 'Ghanavat' },
        ],
      },
      {
        id: 'alborz',
        name: 'البرز',
        nameEn: 'Alborz',
        cities: [
          { id: 'alborz-karaj', name: 'کرج', nameEn: 'Karaj' },
          { id: 'nazarabad', name: 'نظرآباد', nameEn: 'Nazarabad' },
          { id: 'fardis', name: 'فردیس', nameEn: 'Fardis' },
          { id: 'mahdasht', name: 'ماهدشت', nameEn: 'Mahdasht' },
          { id: 'taleghan', name: 'طالقان', nameEn: 'Taleghan' },
          { id: 'savojbolagh', name: 'ساوجبلاغ', nameEn: 'Savojbolagh' },
          { id: 'hashtgerd', name: 'هشتگرد', nameEn: 'Hashtgerd' },
        ],
      },
      {
        id: 'zanjan',
        name: 'زنجان',
        nameEn: 'Zanjan',
        cities: [
          { id: 'zanjan-city', name: 'زنجان', nameEn: 'Zanjan' },
          { id: 'abhar', name: 'ابهر', nameEn: 'Abhar' },
          { id: 'khodabandeh', name: 'خدابنده', nameEn: 'Khodabandeh' },
          { id: 'mahneshan', name: 'ماهنشان', nameEn: 'Mahneshan' },
        ],
      },
      {
        id: 'hamedan',
        name: 'همدان',
        nameEn: 'Hamedan',
        cities: [
          { id: 'hamedan-city', name: 'همدان', nameEn: 'Hamedan' },
          { id: 'malayer', name: 'ملایر', nameEn: 'Malayer' },
          { id: 'nahavand', name: 'نهاوند', nameEn: 'Nahavand' },
          { id: 'tuyserkan', name: 'تویسرکان', nameEn: 'Tuyserkan' },
        ],
      },
      {
        id: 'kermanshah',
        name: 'کرمانشاه',
        nameEn: 'Kermanshah',
        cities: [
          { id: 'kermanshah-city', name: 'کرمانشاه', nameEn: 'Kermanshah' },
          { id: 'sahneh', name: 'صحنه', nameEn: 'Sahneh' },
          { id: 'javanrud', name: 'جوانرود', nameEn: 'Javanrud' },
          { id: 'qasr-shirin', name: 'قصرشیرین', nameEn: 'Qasr Shirin' },
        ],
      },
      {
        id: 'lorestan',
        name: 'لرستان',
        nameEn: 'Lorestan',
        cities: [
          { id: 'khorramabad', name: 'خرم‌آباد', nameEn: 'Khorramabad' },
          { id: 'borujerd', name: 'بروجرد', nameEn: 'Borujerd' },
          { id: 'dorud', name: 'دورود', nameEn: 'Dorud' },
          { id: 'kuhdasht', name: 'کوهدشت', nameEn: 'Kuhdasht' },
        ],
      },
      {
        id: 'ilam',
        name: 'ایلام',
        nameEn: 'Ilam',
        cities: [
          { id: 'ilam-city', name: 'ایلام', nameEn: 'Ilam' },
          { id: 'dehloran', name: 'دهلران', nameEn: 'Dehloran' },
          { id: 'ivan', name: 'ایوان', nameEn: 'Ivan' },
        ],
      },
      {
        id: 'bushehr',
        name: 'بوشهر',
        nameEn: 'Bushehr',
        cities: [
          { id: 'bushehr-city', name: 'بوشهر', nameEn: 'Bushehr' },
          { id: 'borazjan', name: 'برازجان', nameEn: 'Borazjan' },
          { id: 'genaveh', name: 'گناوه', nameEn: 'Genaveh' },
          { id: 'asaluyeh', name: 'عسلویه', nameEn: 'Asaluyeh' },
        ],
      },
      {
        id: 'hormozgan',
        name: 'هرمزگان',
        nameEn: 'Hormozgan',
        cities: [
          { id: 'bandar-abbas', name: 'بندرعباس', nameEn: 'Bandar Abbas' },
          { id: 'kish', name: 'کیش', nameEn: 'Kish' },
          { id: 'qeshm', name: 'قشم', nameEn: 'Qeshm' },
          { id: 'minab', name: 'میناب', nameEn: 'Minab' },
          { id: 'jask', name: 'جاسک', nameEn: 'Jask' },
        ],
      },
      {
        id: 'sistan-baluchestan',
        name: 'سیستان و بلوچستان',
        nameEn: 'Sistan and Baluchestan',
        cities: [
          { id: 'zahedan', name: 'زاهدان', nameEn: 'Zahedan' },
          { id: 'zabol', name: 'زابل', nameEn: 'Zabol' },
          { id: 'chabahar', name: 'چابهار', nameEn: 'Chabahar' },
          { id: 'iranshahr', name: 'ایرانشهر', nameEn: 'Iranshahr' },
        ],
      },
      {
        id: 'yazd',
        name: 'یزد',
        nameEn: 'Yazd',
        cities: [
          { id: 'yazd-city', name: 'یزد', nameEn: 'Yazd' },
          { id: 'ardakan', name: 'اردکان', nameEn: 'Ardakan' },
          { id: 'mehriz', name: 'مهریز', nameEn: 'Mehriz' },
          { id: 'bafq', name: 'بافق', nameEn: 'Bafq' },
        ],
      },
      {
        id: 'chaharmahal-bakhtiari',
        name: 'چهارمحال و بختیاری',
        nameEn: 'Chaharmahal and Bakhtiari',
        cities: [
          { id: 'shahrekord', name: 'شهرکرد', nameEn: 'Shahrekord' },
          { id: 'borujen', name: 'بروجن', nameEn: 'Borujen' },
        ],
      },
      {
        id: 'kohgiluyeh-boyer-ahmad',
        name: 'کهگیلویه و بویراحمد',
        nameEn: 'Kohgiluyeh and Boyer-Ahmad',
        cities: [
          { id: 'yasuj', name: 'یاسوج', nameEn: 'Yasuj' },
          { id: 'dehdasht', name: 'دهدشت', nameEn: 'Dehdasht' },
        ],
      },
      {
        id: 'golestan',
        name: 'گلستان',
        nameEn: 'Golestan',
        cities: [
          { id: 'gorgan', name: 'گرگان', nameEn: 'Gorgan' },
          { id: 'aliabad-katul', name: 'علی‌آباد کتول', nameEn: 'Aliabad Katul' },
          { id: 'azadshahr', name: 'آزادشهر', nameEn: 'Azadshahr' },
          { id: 'kalaleh', name: 'کلاله', nameEn: 'Kalaleh' },
        ],
      },
      {
        id: 'north-khorasan',
        name: 'خراسان شمالی',
        nameEn: 'North Khorasan',
        cities: [
          { id: 'bojnurd', name: 'بجنورد', nameEn: 'Bojnurd' },
          { id: 'shirvan', name: 'شیروان', nameEn: 'Shirvan' },
          { id: 'esfarayen', name: 'اسفراین', nameEn: 'Esfarayen' },
        ],
      },
      {
        id: 'south-khorasan',
        name: 'خراسان جنوبی',
        nameEn: 'South Khorasan',
        cities: [
          { id: 'birjand', name: 'بیرجند', nameEn: 'Birjand' },
          { id: 'qaen', name: 'قائن', nameEn: 'Qaen' },
          { id: 'ferdows', name: 'فردوس', nameEn: 'Ferdows' },
        ],
      },
      {
        id: 'ardabil',
        name: 'اردبیل',
        nameEn: 'Ardabil',
        cities: [
          { id: 'ardabil-city', name: 'اردبیل', nameEn: 'Ardabil' },
          { id: 'parsabad', name: 'پارس‌آباد', nameEn: 'Parsabad' },
          { id: 'khalkhal', name: 'خلخال', nameEn: 'Khalkhal' },
        ],
      },
      {
        id: 'qazvin',
        name: 'قزوین',
        nameEn: 'Qazvin',
        cities: [
          { id: 'qazvin-city', name: 'قزوین', nameEn: 'Qazvin' },
          { id: 'takestan', name: 'تاکستان', nameEn: 'Takestan' },
          { id: 'abyek', name: 'آبیک', nameEn: 'Abyek' },
        ],
      },
      {
        id: 'markazi',
        name: 'مرکزی',
        nameEn: 'Markazi',
        cities: [
          { id: 'arak', name: 'اراک', nameEn: 'Arak' },
          { id: 'saveh', name: 'ساوه', nameEn: 'Saveh' },
          { id: 'khomein', name: 'خمین', nameEn: 'Khomein' },
        ],
      },
    ],
  },
];

// Helper functions
export const getLocationDisplayName = (selectedCities: City[]): string => {
  if (selectedCities.length === 0) return 'هیچ شهری انتخاب نشده';
  const allCities = countries.flatMap(country => country.provinces.flatMap(province => province.cities));
  if (selectedCities.length === allCities.length) return 'تمام ایران';
  if (selectedCities.length === 1) return selectedCities[0].name;
  return `${selectedCities.length} شهر انتخاب شده`;
};

export const encodeLocationParams = (cities: City[]): string => {
  return cities.map(city => city.id).join(',');
};

export const decodeLocationParams = (paramString: string): City[] => {
  const cityIds = paramString.split(',');
  const allCities = countries.flatMap(country => country.provinces.flatMap(province => province.cities));
  return allCities.filter(city => cityIds.includes(city.id));
};

export const getIranCities = (): City[] => {
  const iran = countries.find(country => country.id === 'iran');
  if (!iran) return [];
  return iran.provinces.flatMap(province => province.cities);
};

export const getIranProvinces = (): Province[] => {
  const iran = countries.find(country => country.id === 'iran');
  if (!iran) return [];
  return iran.provinces;
};

export const getCitiesByProvince = (provinceId: string): City[] => {
  const iran = countries.find(country => country.id === 'iran');
  if (!iran) return [];
  const province = iran.provinces.find(p => p.id === provinceId);
  return province ? province.cities : [];
};

export const searchCities = (query: string): City[] => {
  const allCities = getIranCities();
  const lowercaseQuery = query.toLowerCase();
  return allCities.filter(city =>
    city.name.toLowerCase().includes(lowercaseQuery) ||
    city.nameEn.toLowerCase().includes(lowercaseQuery)
  );
};

export const getPopularCities = (): City[] => {
  const popularCityIds = [
    'tehran-city',
    'mashhad',
    'isfahan-city',
    'shiraz',
    'tabriz',
    'karaj',
    'qom-city',
    'kermanshah-city',
    'urmia',
    'rasht',
    'zahedan',
    'hamedan-city',
    'kerman-city',
    'yazd-city',
  ];

  const allCities = getIranCities();
  return allCities.filter(city => popularCityIds.includes(city.id));
};

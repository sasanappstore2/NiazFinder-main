// Location system interfaces
export interface City {
  id: string;
  name: string;
  nameEn: string;
  isIsland?: boolean;
  isPopular?: boolean;
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

// ═══════════════════════════════════════════════════════════════════
// Comprehensive Iran Location Data — All 31 Provinces with Cities
// ═══════════════════════════════════════════════════════════════════

export const countries: Country[] = [
  {
    id: 'iran',
    name: 'ایران',
    nameEn: 'Iran',
    provinces: [
      // ─── ۱. تهران ───
      {
        id: 'tehran',
        name: 'تهران',
        nameEn: 'Tehran',
        cities: [
          { id: 'tehran-city', name: 'تهران', nameEn: 'Tehran', isPopular: true },
          { id: 'karaj', name: 'کرج', nameEn: 'Karaj', isPopular: true },
          { id: 'shahriar', name: 'شهریار', nameEn: 'Shahriar' },
          { id: 'malard', name: 'ملارد', nameEn: 'Malard' },
          { id: 'varamin', name: 'ورامین', nameEn: 'Varamin' },
          { id: 'islamshahr', name: 'اسلامشهر', nameEn: 'Islamshahr' },
          { id: 'rey', name: 'ری', nameEn: 'Rey' },
          { id: 'pakdasht', name: 'پاکدشت', nameEn: 'Pakdasht' },
          { id: 'robatskarim', name: 'رباط‌کریم', nameEn: 'Robat Karim' },
          { id: 'damavand', name: 'دماوند', nameEn: 'Damavand' },
          { id: 'firouzkouh', name: 'فیروزکوه', nameEn: 'Firouzkouh' },
          { id: 'baharestan', name: 'بهارستان', nameEn: 'Baharestan' },
          { id: 'pishva', name: 'پیشوا', nameEn: 'Pishva' },
          { id: 'qods', name: 'قدس', nameEn: 'Qods' },
          { id: 'eshkevar', name: 'اشکوار', nameEn: 'Eshkevar' },
          { id: 'emamshahr', name: 'امامشهر', nameEn: 'Emamshahr' },
        ],
      },
      // ─── ۲. اصفهان ───
      {
        id: 'isfahan',
        name: 'اصفهان',
        nameEn: 'Isfahan',
        cities: [
          { id: 'isfahan-city', name: 'اصفهان', nameEn: 'Isfahan', isPopular: true },
          { id: 'kashan', name: 'کاشان', nameEn: 'Kashan', isPopular: true },
          { id: 'khomeinishahr', name: 'خمینی‌شهر', nameEn: 'Khomeinishahr' },
          { id: 'najafabad', name: 'نجف‌آباد', nameEn: 'Najafabad' },
          { id: 'shahinshahr', name: 'شاهین‌شهر', nameEn: 'Shahinshahr' },
          { id: 'mobarakeh', name: 'مبارکه', nameEn: 'Mobarakeh' },
          { id: 'falavarjan', name: 'فلاورجان', nameEn: 'Falavarjan' },
          { id: 'lenjan', name: 'لنجان', nameEn: 'Lenjan' },
          { id: 'natanz', name: 'نطنز', nameEn: 'Natanz' },
          { id: 'ardestan', name: 'اردستان', nameEn: 'Ardestan' },
          { id: 'khouzankola', name: 'خوزانکلا', nameEn: 'Khouzankola' },
          { id: 'dehaqan', name: 'دهاقان', nameEn: 'Dehaqan' },
          { id: 'semirom', name: 'سمیرم', nameEn: 'Semirom' },
          { id: 'fereydan', name: 'فریدن', nameEn: 'Fereydan' },
          { id: 'fereydunshahr', name: 'فریدونشهر', nameEn: 'Fereydunshahr' },
          { id: 'golpayegan', name: 'گلپایگان', nameEn: 'Golpayegan' },
          { id: 'khansar', name: 'خوانسار', nameEn: 'Khansar' },
          { id: 'tiranchi', name: 'تیرانچی', nameEn: 'Tiranchi' },
          { id: 'bakhtiyar', name: 'بختیار', nameEn: 'Bakhtiyar' },
        ],
      },
      // ─── ۳. فارس ───
      {
        id: 'fars',
        name: 'فارس',
        nameEn: 'Fars',
        cities: [
          { id: 'shiraz', name: 'شیراز', nameEn: 'Shiraz', isPopular: true },
          { id: 'kazerun', name: 'کازرون', nameEn: 'Kazerun' },
          { id: 'marvdasht', name: 'مرودشت', nameEn: 'Marvdasht' },
          { id: 'jahrom', name: 'جهرم', nameEn: 'Jahrom' },
          { id: 'fasa', name: 'فسا', nameEn: 'Fasa' },
          { id: 'darab', name: 'داراب', nameEn: 'Darab' },
          { id: 'larestan', name: 'لار', nameEn: 'Larestan' },
          { id: 'evaz', name: 'اوز', nameEn: 'Evaz' },
          { id: 'gerash', name: 'گراش', nameEn: 'Gerash' },
          { id: 'lar', name: 'لار', nameEn: 'Lar' },
          { id: 'khonj', name: 'خنج', nameEn: 'Khonj' },
          { id: 'mamasani', name: 'ممسنی', nameEn: 'Mamasani' },
          { id: 'nourabad', name: 'نورآباد', nameEn: 'Nourabad' },
          { id: 'sepidan', name: 'سپیدان', nameEn: 'Sepidan' },
          { id: 'abadeh', name: 'آباده', nameEn: 'Abadeh' },
          { id: 'neyriz', name: 'نی‌ریز', nameEn: 'Neyriz' },
          { id: 'estehban', name: 'استهبان', nameEn: 'Estehban' },
          { id: 'zarrindasht', name: 'زرین‌دشت', nameEn: 'Zarrindasht' },
          { id: 'pasargad', name: 'پاسارگاد', nameEn: 'Pasargad' },
          { id: 'ramjerd', name: 'رمژرد', nameEn: 'Ramjerd' },
        ],
      },
      // ─── ۴. خراسان رضوی ───
      {
        id: 'khorasan-razavi',
        name: 'خراسان رضوی',
        nameEn: 'Khorasan Razavi',
        cities: [
          { id: 'mashhad', name: 'مشهد', nameEn: 'Mashhad', isPopular: true },
          { id: 'nishapur', name: 'نیشابور', nameEn: 'Nishapur' },
          { id: 'sabzevar', name: 'سبزوار', nameEn: 'Sabzevar' },
          { id: 'torbatheydariyeh', name: 'تربت حیدریه', nameEn: 'Torbat Heydariyeh' },
          { id: 'kashmar', name: 'کاشمر', nameEn: 'Kashmar' },
          { id: 'gonabad', name: 'گناباد', nameEn: 'Gonabad' },
          { id: 'quchan', name: 'قوچان', nameEn: 'Quchan' },
          { id: 'torbatjam', name: 'تربت جام', nameEn: 'Torbat Jam' },
          { id: 'chenaran', name: 'چناران', nameEn: 'Chenaran' },
          { id: 'khaf', name: 'خاف', nameEn: 'Khaf' },
          { id: 'dargaz', name: 'درگز', nameEn: 'Dargaz' },
          { id: 'taybad', name: 'تایباد', nameEn: 'Taybad' },
          { id: 'bajestan', name: 'بجستان', nameEn: 'Bajestan' },
          { id: 'jowayin', name: 'جوین', nameEn: 'Jowayin' },
          { id: 'kalat', name: 'کلات', nameEn: 'Kalat' },
          { id: 'mehdishahr', name: 'مه‌دیشهر', nameEn: 'Mehdishahr' },
          { id: 'golmakan', name: 'گلمکان', nameEn: 'Golmakan' },
          { id: 'fariman', name: 'فریمان', nameEn: 'Fariman' },
          { id: 'nishabur', name: 'نیشابور', nameEn: 'Nishabur' },
        ],
      },
      // ─── ۵. آذربایجان شرقی ───
      {
        id: 'east-azerbaijan',
        name: 'آذربایجان شرقی',
        nameEn: 'East Azerbaijan',
        cities: [
          { id: 'tabriz', name: 'تبریز', nameEn: 'Tabriz', isPopular: true },
          { id: 'maragheh', name: 'مراغه', nameEn: 'Maragheh' },
          { id: 'mianeh', name: 'میانه', nameEn: 'Mianeh' },
          { id: 'shabestar', name: 'شبستر', nameEn: 'Shabestar' },
          { id: 'marand', name: 'مرند', nameEn: 'Marand' },
          { id: 'bonab', name: 'بناب', nameEn: 'Bonab' },
          { id: 'ahar', name: 'اهر', nameEn: 'Ahar' },
          { id: 'sarab', name: 'سراب', nameEn: 'Sarab' },
          { id: 'hashtrood', name: 'هشتروود', nameEn: 'Hashtrood' },
          { id: 'jolfa', name: 'جلفا', nameEn: 'Jolfa' },
          { id: 'malekan', name: 'ملکان', nameEn: 'Malekan' },
          { id: 'bostanabad', name: 'بستان‌آباد', nameEn: 'Bostanabad' },
          { id: 'harris', name: 'هریس', nameEn: 'Harris' },
          { id: 'azarshahr', name: 'آذرشهر', nameEn: 'Azarshahr' },
          { id: 'oskoo', name: 'اسکو', nameEn: 'Oskoo' },
          { id: 'kaleybar', name: 'کلیبر', nameEn: 'Kaleybar' },
        ],
      },
      // ─── ۶. آذربایجان غربی ───
      {
        id: 'west-azerbaijan',
        name: 'آذربایجان غربی',
        nameEn: 'West Azerbaijan',
        cities: [
          { id: 'urmia', name: 'ارومیه', nameEn: 'Urmia', isPopular: true },
          { id: 'khoy', name: 'خوی', nameEn: 'Khoy' },
          { id: 'mahabad', name: 'مهاباد', nameEn: 'Mahabad' },
          { id: 'sardasht', name: 'سردشت', nameEn: 'Sardasht' },
          { id: 'piranshahr', name: 'پیرانشهر', nameEn: 'Piranshahr' },
          { id: 'miandoab', name: 'میاندوآب', nameEn: 'Miandoab' },
          { id: 'bukan', name: 'بوکان', nameEn: 'Bukan' },
          { id: 'salmas', name: 'سلماس', nameEn: 'Salmas' },
          { id: 'naqadeh', name: 'نقده', nameEn: 'Naqadeh' },
          { id: 'oshnavieh', name: 'اشنویه', nameEn: 'Oshnavieh' },
          { id: 'takab', name: 'تکاب', nameEn: 'Takab' },
          { id: 'maku', name: 'ماکو', nameEn: 'Maku' },
          { id: 'shahindej', name: 'شاهین‌دژ', nameEn: 'Shahindej' },
          { id: 'chaldoran', name: 'چالدران', nameEn: 'Chaldoran' },
        ],
      },
      // ─── ۷. خوزستان ───
      {
        id: 'khuzestan',
        name: 'خوزستان',
        nameEn: 'Khuzestan',
        cities: [
          { id: 'ahvaz', name: 'اهواز', nameEn: 'Ahvaz', isPopular: true },
          { id: 'khorramshahr', name: 'خرمشهر', nameEn: 'Khorramshahr' },
          { id: 'dezful', name: 'دزفول', nameEn: 'Dezful' },
          { id: 'abadan', name: 'آبادان', nameEn: 'Abadan' },
          { id: 'mahshahr', name: 'ماهشهر', nameEn: 'Mahshahr' },
          { id: 'behbahan', name: 'بهبهان', nameEn: 'Behbahan' },
          { id: 'shush', name: 'شوش', nameEn: 'Shush' },
          { id: 'shushtar', name: 'شوشتر', nameEn: 'Shushtar' },
          { id: 'masjedsoleyman', name: 'مسجدسلیمان', nameEn: 'Masjed Soleyman' },
          { id: 'izeh', name: 'ایذه', nameEn: 'Izeh' },
          { id: 'andimeshk', name: 'اندیمشک', nameEn: 'Andimeshk' },
          { id: 'gotvand', name: 'گتوند', nameEn: 'Gotvand' },
          { id: 'lali', name: 'لالی', nameEn: 'Lali' },
          { id: 'baghmalek', name: 'باغ‌ملک', nameEn: 'Baghmalek' },
          { id: 'ramhormoz', name: 'رامهرمز', nameEn: 'Ramhormoz' },
          { id: 'ramshir', name: 'رامشیر', nameEn: 'Ramshir' },
          { id: 'omidieh', name: 'امیدیه', nameEn: 'Omidieh' },
          { id: 'hoveyzeh', name: 'هویزه', nameEn: 'Hoveyzeh' },
          { id: 'karun', name: 'کارون', nameEn: 'Karun' },
          { id: 'bavi', name: 'باوی', nameEn: 'Bavi' },
        ],
      },
      // ─── ۸. کرمان ───
      {
        id: 'kerman',
        name: 'کرمان',
        nameEn: 'Kerman',
        cities: [
          { id: 'kerman-city', name: 'کرمان', nameEn: 'Kerman', isPopular: true },
          { id: 'jiroft', name: 'جیرفت', nameEn: 'Jiroft' },
          { id: 'bam', name: 'بم', nameEn: 'Bam' },
          { id: 'sirjan', name: 'سیرجان', nameEn: 'Sirjan' },
          { id: 'rafsanjan', name: 'رفسنجان', nameEn: 'Rafsanjan' },
          { id: 'zarand', name: 'زرند', nameEn: 'Zarand' },
          { id: 'shahrbabak', name: 'شهربابک', nameEn: 'Shahrbabak' },
          { id: 'bardsir', name: 'بردسیر', nameEn: 'Bardsir' },
          { id: 'kahnooj', name: 'کوهنج', nameEn: 'Kahnooj' },
          { id: 'anbarabad', name: 'انبارآباد', nameEn: 'Anbarabad' },
          { id: 'manujan', name: 'منوجان', nameEn: 'Manujan' },
          { id: 'rudbarjonub', name: 'رودبار جنوب', nameEn: 'Rudbar Jonub' },
          { id: 'faryab', name: 'فاریاب', nameEn: 'Faryab' },
          { id: 'ghaleganj', name: 'قلعه‌گنج', nameEn: 'Ghaleganj' },
          { id: 'baft', name: 'بافت', nameEn: 'Baft' },
          { id: 'ravars', name: 'راور', nameEn: 'Ravars' },
          { id: 'mahani', name: 'مهری', nameEn: 'Mahani' },
        ],
      },
      // ─── ۹. گیلان ───
      {
        id: 'gilan',
        name: 'گیلان',
        nameEn: 'Gilan',
        cities: [
          { id: 'rasht', name: 'رشت', nameEn: 'Rasht', isPopular: true },
          { id: 'bandaranzali', name: 'بندر انزلی', nameEn: 'Bandar Anzali' },
          { id: 'lahijan', name: 'لاهیجان', nameEn: 'Lahijan' },
          { id: 'langrud', name: 'لنگرود', nameEn: 'Langrud' },
          { id: 'fouman', name: 'فومن', nameEn: 'Fouman' },
          { id: 'astara', name: 'آستارا', nameEn: 'Astara' },
          { id: 'astaneashrafiyeh', name: 'آستانه اشرفیه', nameEn: 'Astaneh Ashrafiyeh' },
          { id: 'somehsara', name: 'صومعه‌سرا', nameEn: 'Someh Sara' },
          { id: 'tavak', name: 'تاک', nameEn: 'Tavak' },
          { id: 'talesh', name: 'طوالش', nameEn: 'Talesh' },
          { id: 'siahkal', name: 'سیاهکل', nameEn: 'Siahkal' },
          { id: 'rudsar', name: 'رودسر', nameEn: 'Rudsar' },
          { id: 'aman', name: 'آمان', nameEn: 'Aman' },
          { id: 'roudhan', name: 'رودسر', nameEn: 'Roudhan' },
          { id: 'masouleh', name: 'ماسوله', nameEn: 'Masouleh' },
          { id: 'chaboksar', name: 'چابکسر', nameEn: 'Chaboksar' },
          { id: 'kouchesfahan', name: 'کوچصفهان', nameEn: 'Kouchesfahan' },
        ],
      },
      // ─── ۱۰. مازندران ───
      {
        id: 'mazandaran',
        name: 'مازندران',
        nameEn: 'Mazandaran',
        cities: [
          { id: 'sari', name: 'ساری', nameEn: 'Sari', isPopular: true },
          { id: 'babol', name: 'بابل', nameEn: 'Babol' },
          { id: 'amol', name: 'آمل', nameEn: 'Amol' },
          { id: 'qaemshahr', name: 'قائم‌شهر', nameEn: 'Qaemshahr' },
          { id: 'behshahr', name: 'بهشهر', nameEn: 'Behshahr' },
          { id: 'chalus', name: 'چالوس', nameEn: 'Chalus' },
          { id: 'nowshahr', name: 'نوشهر', nameEn: 'Nowshahr' },
          { id: 'tonkabon', name: 'تنکابن', nameEn: 'Tonkabon' },
          { id: 'ramsar', name: 'رامسر', nameEn: 'Ramsar' },
          { id: 'noor', name: 'نور', nameEn: 'Noor' },
          { id: 'mahmoudabad', name: 'محمودآباد', nameEn: 'Mahmoudabad' },
          { id: 'gorgan', name: 'گرگان', nameEn: 'Gorgan' },
          { id: 'feridunkenar', name: 'فریدونکنار', nameEn: 'Feridunkenar' },
          { id: 'babolsar', name: 'بابلسر', nameEn: 'Babolsar' },
          { id: 'joybar', name: 'جویبار', nameEn: 'Joybar' },
          { id: 'savadkuh', name: 'سوادکوه', nameEn: 'Savadkuh' },
          { id: 'kelardasht', name: 'کلاردشت', nameEn: 'Kelardasht' },
          { id: 'nozad', name: 'نوشهر', nameEn: 'Nozad' },
        ],
      },
      // ─── ۱۱. قم ───
      {
        id: 'qom',
        name: 'قم',
        nameEn: 'Qom',
        cities: [
          { id: 'qom-city', name: 'قم', nameEn: 'Qom', isPopular: true },
          { id: 'kahak', name: 'کهک', nameEn: 'Kahak' },
          { id: 'salafchegan', name: 'سلفچگان', nameEn: 'Salafchegan' },
          { id: 'ghanavat', name: 'قنوات', nameEn: 'Ghanavat' },
          { id: 'jafarabad', name: 'جعفرباد', nameEn: 'Jafarabad' },
          { id: 'veshnaveh', name: 'وشنه', nameEn: 'Veshnaveh' },
        ],
      },
      // ─── ۱۲. البرز ───
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
          { id: 'meshkinshahr', name: 'مشن‌شهر', nameEn: 'Meshkinshahr' },
          { id: 'kamalshahr', name: 'کمالشهر', nameEn: 'Kamalshahr' },
          { id: 'mohammadiyeh', name: 'محمدیه', nameEn: 'Mohammadiyeh' },
        ],
      },
      // ─── ۱۳. زنجان ───
      {
        id: 'zanjan',
        name: 'زنجان',
        nameEn: 'Zanjan',
        cities: [
          { id: 'zanjan-city', name: 'زنجان', nameEn: 'Zanjan' },
          { id: 'abhar', name: 'ابهر', nameEn: 'Abhar' },
          { id: 'khodabandeh', name: 'خدابنده', nameEn: 'Khodabandeh' },
          { id: 'mahneshan', name: 'ماهنشان', nameEn: 'Mahneshan' },
          { id: 'tarom', name: 'طارم', nameEn: 'Tarom' },
          { id: 'soltaniyeh', name: 'سلطانیه', nameEn: 'Soltaniyeh' },
          { id: 'idhaj', name: 'ایجرود', nameEn: 'Ijrud' },
          { id: 'khoramdareh', name: 'خرمدره', nameEn: 'Khorramdarreh' },
        ],
      },
      // ─── ۱۴. همدان ───
      {
        id: 'hamedan',
        name: 'همدان',
        nameEn: 'Hamedan',
        cities: [
          { id: 'hamedan-city', name: 'همدان', nameEn: 'Hamedan', isPopular: true },
          { id: 'malayer', name: 'ملایر', nameEn: 'Malayer' },
          { id: 'nahavand', name: 'نهاوند', nameEn: 'Nahavand' },
          { id: 'tuyserkan', name: 'تویسرکان', nameEn: 'Tuyserkan' },
          { id: 'asadabad', name: 'اسدآباد', nameEn: 'Asadabad' },
          { id: 'bahar', name: 'بهار', nameEn: 'Bahar' },
          { id: 'kabudarahang', name: 'کبودرآهنگ', nameEn: 'Kabudarahang' },
          { id: 'razan', name: 'رزن', nameEn: 'Razan' },
          { id: 'famenin', name: 'فامنین', nameEn: 'Famenin' },
        ],
      },
      // ─── ۱۵. کرمانشاه ───
      {
        id: 'kermanshah',
        name: 'کرمانشاه',
        nameEn: 'Kermanshah',
        cities: [
          { id: 'kermanshah-city', name: 'کرمانشاه', nameEn: 'Kermanshah', isPopular: true },
          { id: 'sahneh', name: 'صحنه', nameEn: 'Sahneh' },
          { id: 'javanrud', name: 'جوانرود', nameEn: 'Javanrud' },
          { id: 'qasrshirin', name: 'قصرشیرین', nameEn: 'Qasr Shirin' },
          { id: 'paveh', name: 'پاوه', nameEn: 'Paveh' },
          { id: 'kangavar', name: 'کنگاور', nameEn: 'Kangavar' },
          { id: 'islamabad', name: 'اسلام‌آباد غرب', nameEn: 'Islamabad Gharb' },
          { id: 'sonqor', name: 'سنقر', nameEn: 'Sonqor' },
          { id: 'gilangharb', name: 'گیلانغرب', nameEn: 'Gilangharb' },
          { id: 'harsin', name: 'هرسین', nameEn: 'Harsin' },
          { id: 'ravansar', name: 'روانسر', nameEn: 'Ravansar' },
          { id: 'dalahu', name: 'دالهو', nameEn: 'Dalahu' },
          { id: 'salasebabajani', name: 'سه‌قلعه', nameEn: 'Salas Babajani' },
        ],
      },
      // ─── ۱۶. لرستان ───
      {
        id: 'lorestan',
        name: 'لرستان',
        nameEn: 'Lorestan',
        cities: [
          { id: 'khorramabad', name: 'خرم‌آباد', nameEn: 'Khorramabad' },
          { id: 'borujerd', name: 'بروجرد', nameEn: 'Borujerd' },
          { id: 'dorud', name: 'دورود', nameEn: 'Dorud' },
          { id: 'kuhdasht', name: 'کوهدشت', nameEn: 'Kuhdasht' },
          { id: 'aligudarz', name: 'الیگودرز', nameEn: 'Aligudarz' },
          { id: 'azna', name: 'ازنا', nameEn: 'Azna' },
          { id: 'nourabad', name: 'نورآباد', nameEn: 'Nourabad' },
          { id: 'poldokhtar', name: 'پلدختر', nameEn: 'Poldokhtar' },
          { id: 'rumeshkan', name: 'رومشکان', nameEn: 'Rumeshkan' },
          { id: 'difful', name: 'درفول', nameEn: 'Difful' },
        ],
      },
      // ─── ۱۷. ایلام ───
      {
        id: 'ilam',
        name: 'ایلام',
        nameEn: 'Ilam',
        cities: [
          { id: 'ilam-city', name: 'ایلام', nameEn: 'Ilam' },
          { id: 'dehloran', name: 'دهلران', nameEn: 'Dehloran' },
          { id: 'ivan', name: 'ایوان', nameEn: 'Ivan' },
          { id: 'mehran', name: 'مهران', nameEn: 'Mehran' },
          { id: 'abdanan', name: 'آبدانان', nameEn: 'Abdanan' },
          { id: 'darrehshahr', name: 'دره‌شهر', nameEn: 'Darrehshahr' },
          { id: 'chardavol', name: 'چرداول', nameEn: 'Chardavol' },
          { id: 'malekshahi', name: 'ملکشاهی', nameEn: 'Malekshahi' },
          { id: 'arkvaz', name: 'ارکواز', nameEn: 'Arkvaz' },
        ],
      },
      // ─── ۱۸. بوشهر ───
      {
        id: 'bushehr',
        name: 'بوشهر',
        nameEn: 'Bushehr',
        cities: [
          { id: 'bushehr-city', name: 'بوشهر', nameEn: 'Bushehr' },
          { id: 'borazjan', name: 'برازجان', nameEn: 'Borazjan' },
          { id: 'genaveh', name: 'گناوه', nameEn: 'Genaveh' },
          { id: 'asaluyeh', name: 'عسلویه', nameEn: 'Asaluyeh' },
          { id: 'kangan', name: 'نگان', nameEn: 'Kangan' },
          { id: 'dayer', name: 'دیر', nameEn: 'Dayer' },
          { id: 'deylam', name: 'دیلم', nameEn: 'Deylam' },
          { id: 'khormoj', name: 'خورموج', nameEn: 'Khormoj' },
          { id: 'ganaveh', name: 'گناوه', nameEn: 'Ganaveh' },
          { id: 'bandartaheri', name: 'بندر طاهری', nameEn: 'Bandar Taheri' },
        ],
      },
      // ─── ۱۹. هرمزگان (شامل جزایر) ───
      {
        id: 'hormozgan',
        name: 'هرمزگان',
        nameEn: 'Hormozgan',
        cities: [
          { id: 'bandarabbas', name: 'بندرعباس', nameEn: 'Bandar Abbas', isPopular: true },
          { id: 'minab', name: 'میناب', nameEn: 'Minab' },
          { id: 'bandarlengeh', name: 'بندرلنگه', nameEn: 'Bandar Lengeh' },
          { id: 'qeshm', name: 'قشم', nameEn: 'Qeshm', isPopular: true, isIsland: true },
          { id: 'kish', name: 'کیش', nameEn: 'Kish', isPopular: true, isIsland: true },
          { id: 'hormuz', name: 'هرمز', nameEn: 'Hormuz', isIsland: true },
          { id: 'hengam', name: 'هنگام', nameEn: 'Hengam', isIsland: true },
          { id: 'lavan', name: 'لاوان', nameEn: 'Lavan', isIsland: true },
          { id: 'larak', name: 'لاک', nameEn: 'Larak', isIsland: true },
          { id: 'hendurabi', name: 'هندورابی', nameEn: 'Hendurabi', isIsland: true },
          { id: 'abumusa', name: 'ابوموسی', nameEn: 'Abu Musa', isIsland: true },
          { id: 'greatertunb', name: 'تنب بزرگ', nameEn: 'Greater Tunb', isIsland: true },
          { id: 'lessertunb', name: 'تنب کوچک', nameEn: 'Lesser Tunb', isIsland: true },
          { id: 'sirri', name: 'سیری', nameEn: 'Sirri', isIsland: true },
          { id: 'farur', name: 'فارور', nameEn: 'Farur', isIsland: true },
          { id: 'bani-forur', name: 'بنی‌فارور', nameEn: 'Bani Forur', isIsland: true },
          { id: 'greaterandsmallerfarur', name: 'فارور بزرگ و کوچک', nameEn: 'Greater and Smaller Farur', isIsland: true },
          { id: 'jask', name: 'جاسک', nameEn: 'Jask' },
          { id: 'rudan', name: 'رودان', nameEn: 'Rudan' },
          { id: 'bastak', name: 'بستک', nameEn: 'Bastak' },
          { id: 'bandarkhamir', name: 'بندرخمیر', nameEn: 'Bandar Khamir' },
          { id: 'hajiabad', name: 'حاجی‌آباد', nameEn: 'Hajiabad' },
          { id: 'parsian', name: 'پارسیان', nameEn: 'Parsian' },
        ],
      },
      // ─── ۲۰. سیستان و بلوچستان ───
      {
        id: 'sistan-baluchestan',
        name: 'سیستان و بلوچستان',
        nameEn: 'Sistan and Baluchestan',
        cities: [
          { id: 'zahedan', name: 'زاهدان', nameEn: 'Zahedan' },
          { id: 'zabol', name: 'زابل', nameEn: 'Zabol' },
          { id: 'chabahar', name: 'چابهار', nameEn: 'Chabahar', isPopular: true },
          { id: 'iranshahr', name: 'ایرانشهر', nameEn: 'Iranshahr' },
          { id: 'khash', name: 'خاش', nameEn: 'Khash' },
          { id: 'saravan', name: 'سراوان', nameEn: 'Saravan' },
          { id: 'nikshahr', name: 'نیکشهر', nameEn: 'Nikshahr' },
          { id: 'sarbaz', name: 'سرباز', nameEn: 'Sarbaz' },
          { id: 'conark', name: 'چنارک', nameEn: 'Konarak' },
          { id: 'hirmand', name: 'هیرمند', nameEn: 'Hirmand' },
          { id: 'delgan', name: 'دلگان', nameEn: 'Delgan' },
          { id: 'qasreqand', name: 'قصرقند', nameEn: 'Qasreqand' },
          { id: 'dalgan', name: 'دلگان', nameEn: 'Dalgan' },
          { id: 'mohammadabad', name: 'محمدآباد', nameEn: 'Mohammadabad' },
          { id: 'fanooj', name: 'فنوج', nameEn: 'Fanooj' },
        ],
      },
      // ─── ۲۱. یزد ───
      {
        id: 'yazd',
        name: 'یزد',
        nameEn: 'Yazd',
        cities: [
          { id: 'yazd-city', name: 'یزد', nameEn: 'Yazd', isPopular: true },
          { id: 'ardakan', name: 'اردکان', nameEn: 'Ardakan' },
          { id: 'mehriz', name: 'مهریز', nameEn: 'Mehriz' },
          { id: 'bafq', name: 'بافق', nameEn: 'Bafq' },
          { id: 'taft', name: 'تفت', nameEn: 'Taft' },
          { id: 'maybod', name: 'میبد', nameEn: 'Maybod' },
          { id: 'abadan', name: 'ابرکوه', nameEn: 'Abarkouh' },
          { id: 'ashkezar', name: 'اشکذر', nameEn: 'Ashkezar' },
          { id: 'bahabad', name: 'بافق', nameEn: 'Bahabad' },
          { id: 'khatam', name: 'خاتم', nameEn: 'Khatam' },
          { id: 'sadoogh', name: 'صدوق', nameEn: 'Sadoogh' },
          { id: 'zarich', name: 'زرچ', nameEn: 'Zarich' },
        ],
      },
      // ─── ۲۲. چهارمحال و بختیاری ───
      {
        id: 'chaharmahal-bakhtiari',
        name: 'چهارمحال و بختیاری',
        nameEn: 'Chaharmahal and Bakhtiari',
        cities: [
          { id: 'shahrekord', name: 'شهرکرد', nameEn: 'Shahrekord' },
          { id: 'borujen', name: 'بروجن', nameEn: 'Borujen' },
          { id: 'farsan', name: 'فارسان', nameEn: 'Farsan' },
          { id: 'lordegan', name: 'لردگان', nameEn: 'Lordegan' },
          { id: 'ardehal', name: 'اردل', nameEn: 'Ardehal' },
          { id: 'kouhrang', name: 'کوهرنگ', nameEn: 'Kouhrang' },
          { id: 'ben', name: 'بن', nameEn: 'Ben' },
          { id: 'samman', name: 'سامان', nameEn: 'Samman' },
          { id: 'junqan', name: 'جونقان', nameEn: 'Junqan' },
        ],
      },
      // ─── ۲۳. کهگیلویه و بویراحمد ───
      {
        id: 'kohgiluyeh-boyer-ahmad',
        name: 'کهگیلویه و بویراحمد',
        nameEn: 'Kohgiluyeh and Boyer-Ahmad',
        cities: [
          { id: 'yasuj', name: 'یاسوج', nameEn: 'Yasuj' },
          { id: 'dehdasht', name: 'دهدشت', nameEn: 'Dehdasht' },
          { id: 'dogonbadan', name: 'دوگنبدان', nameEn: 'Dogonbadan' },
          { id: 'gachsaran', name: 'گچساران', nameEn: 'Gachsaran' },
          { id: 'bahmai', name: 'بهمئی', nameEn: 'Bahmai' },
          { id: 'kohgiluyeh', name: 'کهگیلویه', nameEn: 'Kohgiluyeh' },
          { id: 'likak', name: 'لیکک', nameEn: 'Likak' },
          { id: 'charam', name: 'چرام', nameEn: 'Charam' },
          { id: 'landeh', name: 'لنده', nameEn: 'Landeh' },
        ],
      },
      // ─── ۲۴. گلستان ───
      {
        id: 'golestan',
        name: 'گلستان',
        nameEn: 'Golestan',
        cities: [
          { id: 'gorgan', name: 'گرگان', nameEn: 'Gorgan' },
          { id: 'aliabadkatul', name: 'علی‌آباد کتول', nameEn: 'Aliabad Katul' },
          { id: 'azadshahr', name: 'آزادشهر', nameEn: 'Azadshahr' },
          { id: 'kalaleh', name: 'کلاله', nameEn: 'Kalaleh' },
          { id: 'gonbadkavus', name: 'گنبدکاووس', nameEn: 'Gonbad Kavus' },
          { id: 'minudasht', name: 'مینودشت', nameEn: 'Minudasht' },
          { id: 'kordkuy', name: 'کردکوی', nameEn: 'Kordkuy' },
          { id: 'bandarturkman', name: 'بندرترکمن', nameEn: 'Bandar Turkmen' },
          { id: 'galikash', name: 'گالیکش', nameEn: 'Galikash' },
          { id: 'ramian', name: 'رامیان', nameEn: 'Ramian' },
          { id: 'azarshahr', name: 'آق‌قلا', nameEn: 'Aqqala' },
        ],
      },
      // ─── ۲۵. خراسان شمالی ───
      {
        id: 'north-khorasan',
        name: 'خراسان شمالی',
        nameEn: 'North Khorasan',
        cities: [
          { id: 'bojnurd', name: 'بجنورد', nameEn: 'Bojnurd' },
          { id: 'shirvan', name: 'شیروان', nameEn: 'Shirvan' },
          { id: 'esfarayen', name: 'اسفراین', nameEn: 'Esfarayen' },
          { id: 'jajarm', name: 'جاجرم', nameEn: 'Jajarm' },
          { id: 'manehsaman', name: 'مانه و سملقان', nameEn: 'Maneh o Samalqan' },
          { id: 'farooj', name: 'فاروج', nameEn: 'Farooj' },
          { id: 'garmeh', name: 'گرمه', nameEn: 'Garmeh' },
          { id: 'suvragh', name: 'سوخراگ', nameEn: 'Suvragh' },
        ],
      },
      // ─── ۲۶. خراسان جنوبی ───
      {
        id: 'south-khorasan',
        name: 'خراسان جنوبی',
        nameEn: 'South Khorasan',
        cities: [
          { id: 'birjand', name: 'بیرجند', nameEn: 'Birjand' },
          { id: 'qaen', name: 'قائن', nameEn: 'Qaen' },
          { id: 'ferdows', name: 'فردوس', nameEn: 'Ferdows' },
          { id: 'tabas', name: 'طبس', nameEn: 'Tabas' },
          { id: 'darmian', name: 'دمیان', nameEn: 'Darmian' },
          { id: 'nehbandan', name: 'نهبندان', nameEn: 'Nehbandan' },
          { id: 'sarisabz', name: 'سریسبز', nameEn: 'Sarisabz' },
          { id: 'khosf', name: 'خوسف', nameEn: 'Khosf' },
          { id: 'bashavard', name: 'بشاورود', nameEn: 'Bashavard' },
        ],
      },
      // ─── ۲۷. اردبیل ───
      {
        id: 'ardabil',
        name: 'اردبیل',
        nameEn: 'Ardabil',
        cities: [
          { id: 'ardabil-city', name: 'اردبیل', nameEn: 'Ardabil' },
          { id: 'parsabad', name: 'پارس‌آباد', nameEn: 'Parsabad' },
          { id: 'khalkhal', name: 'خلخال', nameEn: 'Khalkhal' },
          { id: 'meshginshahr', name: 'مشگین‌شهر', nameEn: 'Meshginshahr' },
          { id: 'germi', name: 'گرمی', nameEn: 'Germi' },
          { id: 'bilehsavar', name: 'بیله‌سوار', nameEn: 'Bilehsavar' },
          { id: 'namin', name: 'نمین', nameEn: 'Namin' },
          { id: 'nir', name: 'نیر', nameEn: 'Nir' },
          { id: 'kosar', name: 'کوثر', nameEn: 'Kosar' },
        ],
      },
      // ─── ۲۸. قزوین ───
      {
        id: 'qazvin',
        name: 'قزوین',
        nameEn: 'Qazvin',
        cities: [
          { id: 'qazvin-city', name: 'قزوین', nameEn: 'Qazvin' },
          { id: 'takestan', name: 'تاکستان', nameEn: 'Takestan' },
          { id: 'abyek', name: 'آبیک', nameEn: 'Abyek' },
          { id: 'boinnzahra', name: 'بوئین‌زهرا', nameEn: 'Boinn Zahra' },
          { id: 'avaj', name: 'آوج', nameEn: 'Avaj' },
          { id: 'tarom-e-olfat', name: 'طالارالعلفا', nameEn: 'Tarom Olfat' },
          { id: 'alvand', name: 'الوند', nameEn: 'Alvand' },
          { id: 'esfarvarin', name: 'اسفرورین', nameEn: 'Esfarvarin' },
        ],
      },
      // ─── ۲۹. مرکزی ───
      {
        id: 'markazi',
        name: 'مرکزی',
        nameEn: 'Markazi',
        cities: [
          { id: 'arak', name: 'اراک', nameEn: 'Arak' },
          { id: 'saveh', name: 'ساوه', nameEn: 'Saveh' },
          { id: 'khomein', name: 'خمین', nameEn: 'Khomein' },
          { id: 'delijan', name: 'دلیجان', nameEn: 'Delijan' },
          { id: 'mahallat', name: 'محلات', nameEn: 'Mahallat' },
          { id: 'komijan', name: 'کمیجان', nameEn: 'Komijan' },
          { id: 'shazand', name: 'شازند', nameEn: 'Shazand' },
          { id: 'tafresh', name: 'تفرش', nameEn: 'Tafresh' },
          { id: 'ashtian', name: 'آشتیان', nameEn: 'Ashtian' },
          { id: 'khondab', name: 'خنداب', nameEn: 'Khondab' },
          { id: 'zarandiyeh', name: 'زرندیه', nameEn: 'Zarandiyeh' },
        ],
      },
      // ─── ۳۰. خوزستان (duplicate removed, see above) ───
      // ─── ۳۰. سمنان ───
      {
        id: 'semnan',
        name: 'سمنان',
        nameEn: 'Semnan',
        cities: [
          { id: 'semnan-city', name: 'سمنان', nameEn: 'Semnan' },
          { id: 'shahrood', name: 'شاهرود', nameEn: 'Shahrood' },
          { id: 'damghan', name: 'دامغان', nameEn: 'Damghan' },
          { id: 'garmsar', name: 'گرمسار', nameEn: 'Garmsar' },
          { id: 'mehdishahr', name: 'مه‌دیشهر', nameEn: 'Mehdishahr' },
          { id: 'aradan', name: 'آرادان', nameEn: 'Aradan' },
          { id: 'sorkheh', name: 'سرخه', nameEn: 'Sorkheh' },
          { id: 'bayat', name: 'بایات', nameEn: 'Bayat' },
          { id: 'miandasht', name: 'میاندشت', nameEn: 'Miandasht' },
          { id: 'shahmirzad', name: 'شاه‌میرزاد', nameEn: 'Shahmirzad' },
          { id: 'kalateh', name: 'کلاته', nameEn: 'Kalateh' },
          { id: 'chashm', name: 'چشمه‌علی', nameEn: 'Cheshmeh Ali' },
        ],
      },
      // ─── ۳۱. کردستان ───
      {
        id: 'kurdistan',
        name: 'کردستان',
        nameEn: 'Kurdistan',
        cities: [
          { id: 'sanandaj', name: 'سنندج', nameEn: 'Sanandaj' },
          { id: 'saghez', name: 'سقز', nameEn: 'Saghez' },
          { id: 'marivan', name: 'مریوان', nameEn: 'Marivan' },
          { id: 'baneh', name: 'بانه', nameEn: 'Baneh' },
          { id: 'kamyaran', name: 'کامیاران', nameEn: 'Kamyaran' },
          { id: 'bijar', name: 'بیجار', nameEn: 'Bijar' },
          { id: 'qorveh', name: 'قروه', nameEn: 'Qorveh' },
          { id: 'dehgolan', name: 'دهگلان', nameEn: 'Dehgolan' },
          { id: 'diwandareh', name: 'دیواندره', nameEn: 'Diwandareh' },
          { id: 'hawraman', name: 'هورامان', nameEn: 'Hawraman' },
          { id: 'sarvabad', name: 'سروآباد', nameEn: 'Sarvabad' },
          { id: 'kurdistan-other', name: 'باشت', nameEn: 'Basht' },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
// Popular Cities (quick access)
// ═══════════════════════════════════════════════════════════════════
export const POPULAR_CITY_IDS = new Set([
  'tehran-city', 'mashhad', 'isfahan-city', 'shiraz', 'tabriz',
  'karaj', 'qom-city', 'kermanshah-city', 'urmia', 'rasht',
  'zahedan', 'hamedan-city', 'kerman-city', 'yazd-city', 'ahvaz',
  'kish', 'qeshm', 'chabahar', 'sari', 'bandarabbas',
]);

export const ISLANDS = [
  'kish', 'qeshm', 'hormuz', 'hengam', 'lavan', 'larak',
  'hendurabi', 'abumusa', 'greatertunb', 'lessertunb',
  'sirri', 'farur', 'bani-forur',
];

// ═══════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════

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

export const searchCities = (query: string): { city: City; provinceName: string }[] => {
  const iran = countries.find(country => country.id === 'iran');
  if (!iran) return [];
  const lowercaseQuery = query.toLowerCase();
  const results: { city: City; provinceName: string }[] = [];
  iran.provinces.forEach(province => {
    province.cities.forEach(city => {
      if (
        city.name.includes(lowercaseQuery) ||
        city.nameEn.toLowerCase().includes(lowercaseQuery) ||
        province.name.includes(lowercaseQuery) ||
        province.nameEn.toLowerCase().includes(lowercaseQuery)
      ) {
        results.push({ city, provinceName: province.name });
      }
    });
  });
  return results;
};

export const getPopularCities = (): City[] => {
  const allCities = getIranCities();
  return allCities.filter(city => city.isPopular);
};

export const getIslands = (): City[] => {
  const allCities = getIranCities();
  return allCities.filter(city => city.isIsland);
};

export const getProvinceById = (provinceId: string): Province | undefined => {
  const iran = countries.find(country => country.id === 'iran');
  return iran?.provinces.find(p => p.id === provinceId);
};

export const getCityById = (cityId: string): City | undefined => {
  const allCities = getIranCities();
  return allCities.find(c => c.id === cityId);
};

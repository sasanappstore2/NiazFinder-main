# 🚀 برنامه پیاده‌سازی سیستم Smart Intake برای NiazFinder

## 📌 هدف پروژه
ساخت یک سیستم کاملاً هوشمند برای استخراج خودکار و دقیق تمام فیلدهای نیاز از متن ورودی کاربر، با ترکیب Rules و AI به صورت همزمان.

## 🎯 اهداف کلیدی
1. **استخراج کامل فیلدها**: دسته‌بندی، شهر، محله، نوع معامله، بودجه، متراژ، تعداد خواب و ...
2. **رفع ابهام محله‌های مشابه**: تشخیص چند خیابان فردوسی یا بنفشه در مشهد
3. **تشخیص هوشمند نوع معامله**: از روی مبالغ (100 میلیون رهن + 10 میلیون اجاره)
4. **Real-time feedback**: پر کردن فیلدها همزمان با تایپ کاربر
5. **Context awareness**: استفاده از شهر انتخابی برای تشخیص بهتر محله

## 📋 مراحل اجرا

### Phase 1: Analysis & Infrastructure (تحلیل و زیرساخت)

#### Step 1.1: بررسی وضعیت فعلی
```typescript
// فایل‌های کلیدی که باید بررسی شوند:
- src/intake/engine/intakeEngine.ts
- src/intake/intelligence-engine/hybrid/hybrid-pipeline.ts
- src/intake/extractors/attributeExtractors.ts
- src/intake/extractors/transactionExtractor.ts
- src/app/api/intake/analyze/route.ts
- src/components/need-intake/NeedIntakePanel.tsx
```

**مشکلات شناسایی شده:**
1. عدم استخراج کامل همه فیلدها در یک پاس
2. نبود سیستم disambiguation برای محله‌های مشابه
3. عدم تشخیص نوع معامله از pattern مبالغ
4. نبود real-time extraction در UI
5. عدم استفاده از context شهر در تشخیص محله

#### Step 1.2: ایجاد ساختار جدید
```bash
# ایجاد دایرکتوری‌های جدید
mkdir -p src/intake/smart-extractor
mkdir -p src/intake/smart-extractor/rules
mkdir -p src/intake/smart-extractor/ai
mkdir -p src/intake/smart-extractor/disambiguation
mkdir -p src/intake/smart-extractor/validators
mkdir -p src/intake/smart-extractor/tests
```

### Phase 2: Core Engine Development (توسعه موتور اصلی)

#### Step 2.1: ساخت Smart Field Extractor
```typescript
// فایل: src/intake/smart-extractor/types.ts

export interface SmartExtractionResult {
  // فیلدهای اصلی
  category: {
    value: string | null;
    subcategory: string | null;
    confidence: number;
    alternatives?: Array<{
      slug: string;
      label: string;
      confidence: number;
    }>;
  };

  location: {
    city: string | null;
    citySlug: string | null;
    neighborhood: string | null;
    neighborhoodSlug: string | null;
    confidence: number;
    disambiguationNeeded?: boolean;
    alternatives?: Array<{
      neighborhood: string;
      neighborhoodSlug: string;
      district?: string;
      landmarks?: string[];
      mapBounds?: [number, number, number, number];
    }>;
  };

  transaction: {
    type: TransactionType | null;
    dealType?: 'sale' | 'rent' | 'full-mortgage';
    confidence: number;
  };

  budget: {
    min: number | null;
    max: number | null;
    depositAmount?: number | null;
    rentAmount?: number | null;
    confidence: number;
  };

  property: {
    area: number | null;
    rooms: number | null;
    hasParking?: boolean;
    hasElevator?: boolean;
    hasStorage?: boolean;
    floor?: number | null;
    totalFloors?: number | null;
    age?: number | null;
    confidence: number;
  };

  metadata: {
    needTitle?: string;
    needDescription?: string;
    urgency?: 'immediate' | 'this_week' | 'this_month' | 'flexible';
    contactPreference?: 'phone' | 'chat' | 'both';
  };

  validation: {
    isComplete: boolean;
    missingFields: string[];
    warnings: string[];
    suggestions: string[];
  };

  trace?: {
    rulesUsed: string[];
    aiCalled: boolean;
    extractionTime: number;
    cacheHit?: boolean;
  };
}
```

#### Step 2.2: پیاده‌سازی Rule Engine پیشرفته
```typescript
// فایل: src/intake/smart-extractor/rules/advanced-rules-engine.ts

interface ExtractionRule {
  id: string;
  field: string;
  patterns: RegExp[];
  extractor: (match: RegExpMatchArray, text: string) => any;
  confidence: number;
  priority: number;
}

const EXTRACTION_RULES: ExtractionRule[] = [
  // رهن و اجاره ترکیبی
  {
    id: 'deposit_rent_combined',
    field: 'budget',
    patterns: [
      /(\d+(?:\.\d+)?)\s*(?:میلیون|میلیارد)\s*رهن.*?(\d+(?:\.\d+)?)\s*(?:میلیون|تومان|تومن)\s*اجاره/u,
      /رهن\s*[:]\s*(\d+).*?اجاره\s*[:]\s*(\d+)/u,
      /ودیعه\s*[:]\s*(\d+).*?ماهانه\s*[:]\s*(\d+)/u
    ],
    extractor: (match, text) => {
      const isFirstBillion = text.includes('میلیارد') && 
                           text.indexOf('میلیارد') < text.indexOf(match[2]);
      return {
        depositAmount: parseAmount(match[1], isFirstBillion ? 'billion' : 'million'),
        rentAmount: parseAmount(match[2], 'million'),
        transactionType: 'DEPOSIT_AND_RENT'
      };
    },
    confidence: 0.95,
    priority: 10
  },

  // رهن کامل
  {
    id: 'full_deposit',
    field: 'budget',
    patterns: [
      /رهن\s*کامل\s*(\d+(?:\.\d+)?)\s*(?:میلیون|میلیارد)/u,
      /فقط\s*رهن\s*(\d+(?:\.\d+)?)\s*(?:میلیون|میلیارد)/u,
      /(\d+(?:\.\d+)?)\s*(?:میلیون|میلیارد)\s*رهن\s*کامل/u
    ],
    extractor: (match, text) => {
      const isBillion = text.includes('میلیارد');
      return {
        depositAmount: parseAmount(match[1], isBillion ? 'billion' : 'million'),
        transactionType: 'FULL_DEPOSIT'
      };
    },
    confidence: 0.95,
    priority: 9
  },

  // محله با context شهر
  {
    id: 'neighborhood_with_context',
    field: 'location',
    patterns: [
      /(?:محله|خیابان|بلوار|میدان|کوچه)\s*([؀-ۿ\s]+?)(?:\s|،|\.)/u,
      /(?:نزدیک|نبش|حوالی|اطراف)\s*([؀-ۿ\s]+?)(?:\s|،|\.)/u
    ],
    extractor: (match, text) => {
      return {
        neighborhood: match[1].trim(),
        needsDisambiguation: true
      };
    },
    confidence: 0.8,
    priority: 5
  },

  // متراژ با واحدهای مختلف
  {
    id: 'area_advanced',
    field: 'property',
    patterns: [
      /(\d{2,4})\s*(?:متر|متری|مترمربع|m2|m²)/u,
      /(?:متراژ|مساحت|زیربنا)\s*[:]\s*(\d{2,4})/u,
      /(\d{2,4})\s+م(?!ی)/u // متر به اختصار
    ],
    extractor: (match) => {
      const value = parseInt(match[1]);
      if (value >= 20 && value <= 10000) {
        return { area: value };
      }
      return null;
    },
    confidence: 0.9,
    priority: 7
  },

  // طبقه و تعداد طبقات
  {
    id: 'floor_info',
    field: 'property',
    patterns: [
      /طبقه\s*(\d+)\s*از\s*(\d+)/u,
      /(\d+)\s*طبقه\s*از\s*(\d+)/u,
      /طبقه\s*(\w+)/u // اول، دوم، سوم
    ],
    extractor: (match) => {
      if (match[2]) {
        return {
          floor: parseInt(match[1]),
          totalFloors: parseInt(match[2])
        };
      }
      // تبدیل کلمات فارسی به عدد
      const floorWords: Record<string, number> = {
        'همکف': 0, 'اول': 1, 'دوم': 2, 'سوم': 3,
        'چهارم': 4, 'پنجم': 5, 'ششم': 6
      };
      const floor = floorWords[match[1]] ?? parseInt(match[1]);
      return { floor };
    },
    confidence: 0.85,
    priority: 6
  }
];
```

#### Step 2.3: پیاده‌سازی AI Enhancement Layer
```typescript
// فایل: src/intake/smart-extractor/ai/ai-enhancer.ts

interface AIEnhancerConfig {
  model: 'gemma' | 'gpt' | 'claude';
  maxRetries: number;
  timeout: number;
  cacheResults: boolean;
}

export class AIEnhancer {
  private cache: Map<string, any> = new Map();

  async enhance(
    text: string,
    partialResult: Partial<SmartExtractionResult>,
    config: AIEnhancerConfig
  ): Promise<SmartExtractionResult> {
    const cacheKey = this.getCacheKey(text);
    
    if (config.cacheResults && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const prompt = this.buildPrompt(text, partialResult);
    const aiResult = await this.callAI(prompt, config);
    
    const merged = this.mergeResults(partialResult, aiResult);
    
    if (config.cacheResults) {
      this.cache.set(cacheKey, merged);
    }
    
    return merged;
  }

  private buildPrompt(text: string, partial: Partial<SmartExtractionResult>): string {
    return `
    شما یک سیستم هوشمند استخراج اطلاعات ملک هستید.
    
    متن نیاز:
    "${text}"
    
    اطلاعات استخراج شده تا کنون:
    ${JSON.stringify(partial, null, 2)}
    
    لطفا فیلدهای زیر را استخراج یا تکمیل کنید:
    1. دسته‌بندی (نوع ملک)
    2. شهر و محله (اگر در متن ذکر شده)
    3. نوع معامله (خرید/فروش/اجاره/رهن)
    4. بودجه یا قیمت
    5. ویژگی‌های ملک (متراژ، تعداد خواب، امکانات)
    
    پاسخ را به صورت JSON با ساختار مشخص برگردانید.
    `;
  }

  private async callAI(prompt: string, config: AIEnhancerConfig): Promise<any> {
    // پیاده‌سازی فراخوانی AI بر اساس model
    // این بخش باید با توجه به API موجود پیاده‌سازی شود
    return {};
  }

  private mergeResults(
    partial: Partial<SmartExtractionResult>,
    aiResult: any
  ): SmartExtractionResult {
    // ادغام هوشمند نتایج
    // اولویت به فیلدهایی که confidence بالاتر دارند
    return {} as SmartExtractionResult;
  }

  private getCacheKey(text: string): string {
    // تولید کلید کش بر اساس متن نرمال شده
    return crypto.createHash('md5').update(text.toLowerCase()).digest('hex');
  }
}
```

### Phase 3: Neighborhood Disambiguation System (سیستم رفع ابهام محله)

#### Step 3.1: ساخت Disambiguation Engine
```typescript
// فایل: src/intake/smart-extractor/disambiguation/neighborhood-disambiguator.ts

interface NeighborhoodCandidate {
  id: string;
  name: string;
  slug: string;
  cityId: string;
  cityName: string;
  district?: string;
  landmarks: string[];
  popularPlaces: string[];
  mapCenter: [number, number];
  mapBounds: [number, number, number, number];
  matchScore: number;
}

export class NeighborhoodDisambiguator {
  private neighborhoodDB: Map<string, NeighborhoodCandidate[]>;

  constructor() {
    this.loadNeighborhoodDatabase();
  }

  async disambiguate(
    neighborhoodName: string,
    cityContext?: string,
    additionalContext?: string[]
  ): Promise<{
    exact: NeighborhoodCandidate | null;
    candidates: NeighborhoodCandidate[];
    needsUserInput: boolean;
  }> {
    const normalized = this.normalize(neighborhoodName);
    
    // جستجو در دیتابیس
    let candidates = this.searchNeighborhoods(normalized, cityContext);
    
    // اگر فقط یک کاندید است
    if (candidates.length === 1) {
      return {
        exact: candidates[0],
        candidates: [],
        needsUserInput: false
      };
    }
    
    // اگر چند کاندید است، امتیازدهی بر اساس context
    if (candidates.length > 1) {
      candidates = this.scoreByContext(candidates, additionalContext);
      
      // اگر یکی امتیاز خیلی بالاتری دارد
      const topScore = candidates[0].matchScore;
      const secondScore = candidates[1]?.matchScore || 0;
      
      if (topScore > secondScore * 1.5) {
        return {
          exact: candidates[0],
          candidates: candidates.slice(1),
          needsUserInput: false
        };
      }
      
      // نیاز به تایید کاربر
      return {
        exact: null,
        candidates,
        needsUserInput: true
      };
    }
    
    // هیچ کاندیدی پیدا نشد
    return {
      exact: null,
      candidates: [],
      needsUserInput: false
    };
  }

  private searchNeighborhoods(
    name: string,
    cityContext?: string
  ): NeighborhoodCandidate[] {
    const results: NeighborhoodCandidate[] = [];
    
    for (const [key, neighborhoods] of this.neighborhoodDB.entries()) {
      // اگر شهر مشخص است، فقط در آن شهر جستجو کن
      if (cityContext && !key.includes(cityContext)) {
        continue;
      }
      
      for (const n of neighborhoods) {
        const score = this.calculateSimilarity(name, n.name);
        if (score > 0.7) {
          results.push({ ...n, matchScore: score });
        }
      }
    }
    
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  private scoreByContext(
    candidates: NeighborhoodCandidate[],
    context?: string[]
  ): NeighborhoodCandidate[] {
    if (!context || context.length === 0) {
      return candidates;
    }
    
    return candidates.map(c => {
      let contextScore = c.matchScore;
      
      // بررسی landmarks
      for (const landmark of c.landmarks) {
        for (const ctx of context) {
          if (ctx.includes(landmark) || landmark.includes(ctx)) {
            contextScore += 0.1;
          }
        }
      }
      
      return { ...c, matchScore: Math.min(contextScore, 1) };
    }).sort((a, b) => b.matchScore - a.matchScore);
  }

  private calculateSimilarity(s1: string, s2: string): number {
    // الگوریتم Levenshtein distance
    // یا استفاده از کتابخانه string-similarity
    return 0;
  }

  private normalize(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/[ً-ٰٟ]/g, '') // حذف اعراب
      .replace(/[أإآا]/g, 'ا')
      .replace(/[ىي]/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/ه$/g, 'ه'); // ه آخر کلمه
  }

  private loadNeighborhoodDatabase() {
    // بارگذاری از دیتابیس یا فایل JSON
    // این بخش باید با داده‌های واقعی پر شود
  }
}
```

#### Step 3.2: ایجاد UI Component برای Disambiguation
```typescript
// فایل: src/components/need-intake/NeighborhoodDisambiguationModal.tsx

interface DisambiguationModalProps {
  isOpen: boolean;
  candidates: NeighborhoodCandidate[];
  onSelect: (candidate: NeighborhoodCandidate) => void;
  onClose: () => void;
}

export function NeighborhoodDisambiguationModal({
  isOpen,
  candidates,
  onSelect,
  onClose
}: DisambiguationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>انتخاب محله دقیق</DialogTitle>
          <DialogDescription>
            چند محله با این نام پیدا شد. لطفا محله مورد نظر را انتخاب کنید:
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {candidates.map((candidate) => (
            <Card
              key={candidate.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onSelect(candidate)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{candidate.name}</CardTitle>
                <CardDescription>
                  {candidate.district && `منطقه ${candidate.district} - `}
                  {candidate.cityName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {candidate.landmarks.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">نزدیک به:</span>
                      <span className="mr-2">
                        {candidate.landmarks.slice(0, 3).join('، ')}
                      </span>
                    </div>
                  )}
                  
                  {/* نقشه کوچک */}
                  <div className="h-32 bg-gray-100 rounded">
                    {/* اینجا باید نقشه نمایش داده شود */}
                    <MiniMap center={candidate.mapCenter} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            انصراف
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Phase 4: Real-time Integration (ادغام Real-time)

#### Step 4.1: ساخت Real-time Hook
```typescript
// فایل: src/hooks/use-realtime-extraction.ts

export function useRealtimeExtraction(
  debounceMs: number = 300
) {
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<SmartExtractionResult | null>(null);
  const abortControllerRef = useRef<AbortController>();

  const extract = useMemo(
    () => debounce(async (text: string, options: SmartExtractionOptions) => {
      // لغو درخواست قبلی
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setExtracting(true);

      try {
        const result = await extractSmartFields(text, '', {
          ...options,
          realTime: true,
          signal: abortControllerRef.current.signal
        });

        setResult(result);
        
        // Auto-fill فیلدهای فرم
        autoFillForm(result);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Extraction error:', error);
        }
      } finally {
        setExtracting(false);
      }
    }, debounceMs),
    [debounceMs]
  );

  useEffect(() => {
    return () => {
      extract.cancel();
      abortControllerRef.current?.abort();
    };
  }, [extract]);

  return {
    extract,
    extracting,
    result
  };
}
```

#### Step 4.2: اتصال به NeedIntakePanel
```typescript
// تغییرات در: src/components/need-intake/NeedIntakePanel.tsx

function NeedIntakePanel(props) {
  const { extract, extracting, result } = useRealtimeExtraction(300);
  
  // هر وقت متن تغییر کرد
  useEffect(() => {
    if (needText || detailsText) {
      extract(composeFullText(needText, detailsText), {
        preferredCity: selectedCity,
        preferredCitySlug: selectedCitySlug
      });
    }
  }, [needText, detailsText, selectedCity]);

  // نمایش فیلدهای استخراج شده
  useEffect(() => {
    if (result && !extracting) {
      // پر کردن خودکار فیلدها
      if (result.category.value) {
        setSelectedCategory(result.category.value);
      }
      if (result.location.neighborhood) {
        setSelectedNeighborhood(result.location.neighborhood);
      }
      if (result.budget.max) {
        form.setValue('budgetMax', result.budget.max);
      }
      // ...
    }
  }, [result, extracting]);

  return (
    <>
      {/* نمایش Live Extraction Status */}
      {extracting && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          در حال تحلیل متن...
        </div>
      )}

      {/* نمایش فیلدهای شناسایی شده */}
      {result && !extracting && (
        <SmartFieldsPreview result={result} />
      )}

      {/* فرم اصلی */}
      {/* ... */}
    </>
  );
}
```

### Phase 5: Test Data Generation (تولید داده‌های تست)

#### Step 5.1: ساخت Test Generator
```typescript
// فایل: src/intake/smart-extractor/tests/test-data-generator.ts

interface TestCase {
  id: string;
  input: {
    needText: string;
    detailsText?: string;
    selectedCity?: string;
  };
  expected: {
    category: string;
    subcategory?: string;
    city: string;
    neighborhood?: string;
    transactionType: string;
    budgetMin?: number;
    budgetMax?: number;
    area?: number;
    rooms?: number;
  };
  description: string;
  tags: string[];
}

export class TestDataGenerator {
  private templates = {
    apartment_rent: [
      "آپارتمان {rooms} خواب {area} متر برای اجاره در {neighborhood} {city}",
      "اجاره آپارتمان {area} متری {rooms} خوابه {neighborhood}",
      "دنبال آپارتمان اجاره‌ای {rooms} خواب حدود {area} متر تو {neighborhood} هستم"
    ],
    apartment_sale: [
      "خرید آپارتمان {area} متر {rooms} خواب در {neighborhood} {city}",
      "آپارتمان {rooms} خوابه {area} متری برای فروش {neighborhood}",
      "می‌خوام یه آپارتمان {rooms} خواب حدود {area} متر تو {neighborhood} بخرم"
    ],
    deposit_rent: [
      "آپارتمان {rooms} خواب با {deposit} رهن و {rent} اجاره در {neighborhood}",
      "{deposit} میلیون رهن {rent} میلیون اجاره {rooms} خواب {neighborhood}",
      "دنبال خونه با {deposit} رهن و {rent} اجاره ماهانه تو {neighborhood} هستم"
    ],
    full_deposit: [
      "آپارتمان {rooms} خواب رهن کامل {deposit} میلیون در {neighborhood}",
      "رهن کامل {deposit} میلیون {rooms} خواب {area} متر {neighborhood}",
      "فقط رهن {deposit} میلیون برای {rooms} خواب تو {neighborhood}"
    ],
    commercial: [
      "مغازه {area} متر برای اجاره در {neighborhood} {city}",
      "دنبال مغازه {area} متری برای {business_type} تو {neighborhood}",
      "واحد تجاری {area} متر {neighborhood} برای {business_type}"
    ]
  };

  private cities = [
    { name: 'تهران', slug: 'tehran' },
    { name: 'مشهد', slug: 'mashhad' },
    { name: 'اصفهان', slug: 'isfahan' },
    { name: 'شیراز', slug: 'shiraz' },
    { name: 'تبریز', slug: 'tabriz' }
  ];

  private neighborhoods = {
    tehran: ['ونک', 'تجریش', 'سعادت‌آباد', 'نیاوران', 'الهیه', 'زعفرانیه'],
    mashhad: ['احمدآباد', 'وکیل‌آباد', 'سجاد', 'قاسم‌آباد', 'الهیه', 'فردوسی'],
    isfahan: ['جلفا', 'زینبیه', 'مارچین', 'باغ زرشک', 'شهرک کوثر'],
    shiraz: ['معالی‌آباد', 'قصردشت', 'گلستان', 'فرهنگ شهر'],
    tabriz: ['ولیعصر', 'آبرسان', 'شهرک امام', 'ائل گلی']
  };

  generate(count: number = 100): TestCase[] {
    const testCases: TestCase[] = [];
    const categories = Object.keys(this.templates);
    
    for (let i = 0; i < count; i++) {
      const category = this.randomChoice(categories);
      const template = this.randomChoice(this.templates[category]);
      const city = this.randomChoice(this.cities);
      const neighborhood = this.randomChoice(this.neighborhoods[city.slug]);
      
      const variables = this.generateVariables(category);
      const needText = this.fillTemplate(template, {
        ...variables,
        city: city.name,
        neighborhood
      });
      
      testCases.push({
        id: `test-${i + 1}`,
        input: {
          needText,
          selectedCity: city.slug
        },
        expected: {
          category: this.getCategoryFromTemplate(category),
          city: city.name,
          neighborhood,
          transactionType: this.getTransactionType(category),
          ...variables
        },
        description: `تست ${category} در ${city.name}`,
        tags: [category, city.slug, 'generated']
      });
    }
    
    return testCases;
  }

  private generateVariables(category: string): any {
    const common = {
      area: this.randomBetween(50, 200),
      rooms: this.randomBetween(1, 4)
    };
    
    switch(category) {
      case 'deposit_rent':
        return {
          ...common,
          deposit: this.randomBetween(50, 500),
          rent: this.randomBetween(5, 30)
        };
      
      case 'full_deposit':
        return {
          ...common,
          deposit: this.randomBetween(200, 1000)
        };
      
      case 'apartment_sale':
        return {
          ...common,
          budgetMax: this.randomBetween(1000, 10000) * 1000000
        };
      
      case 'commercial':
        return {
          area: this.randomBetween(20, 500),
          business_type: this.randomChoice(['رستوران', 'مزون', 'دفتر', 'آرایشگاه'])
        };
      
      default:
        return common;
    }
  }

  private fillTemplate(template: string, vars: any): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), String(value));
    }
    return result;
  }

  private randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private getCategoryFromTemplate(template: string): string {
    const mapping = {
      apartment_rent: 'apartment-rent',
      apartment_sale: 'apartment-sale',
      deposit_rent: 'apartment-rent',
      full_deposit: 'apartment-rent',
      commercial: 'shop'
    };
    return mapping[template] || 'unknown';
  }

  private getTransactionType(template: string): string {
    const mapping = {
      apartment_rent: 'RENT',
      apartment_sale: 'BUY',
      deposit_rent: 'DEPOSIT_AND_RENT',
      full_deposit: 'FULL_DEPOSIT',
      commercial: 'RENT'
    };
    return mapping[template] || 'UNKNOWN';
  }
}
```

#### Step 5.2: تست‌های Edge Case
```typescript
// فایل: src/intake/smart-extractor/tests/edge-cases.test.ts

describe('Smart Extractor Edge Cases', () => {
  const extractor = new SmartFieldExtractor();

  test('تشخیص رهن و اجاره از pattern مبالغ', async () => {
    const result = await extractor.extract(
      "خونه میخوام 100 میلیون رهن 10 میلیون اجاره"
    );
    
    expect(result.budget.depositAmount).toBe(100_000_000);
    expect(result.budget.rentAmount).toBe(10_000_000);
    expect(result.transaction.type).toBe('DEPOSIT_AND_RENT');
  });

  test('تشخیص محله‌های مشابه در مشهد', async () => {
    const result = await extractor.extract(
      "آپارتمان در خیابان فردوسی",
      { preferredCity: 'مشهد' }
    );
    
    expect(result.location.disambiguationNeeded).toBe(true);
    expect(result.location.alternatives.length).toBeGreaterThan(1);
  });

  test('تشخیص متراژ با واحدهای مختلف', async () => {
    const cases = [
      { text: "100 متر", expected: 100 },
      { text: "100متری", expected: 100 },
      { text: "100 m2", expected: 100 },
      { text: "متراژ 100", expected: 100 },
      { text: "100 م", expected: 100 }
    ];
    
    for (const tc of cases) {
      const result = await extractor.extract(tc.text);
      expect(result.property.area).toBe(tc.expected);
    }
  });

  test('تشخیص نوع معامله از context', async () => {
    const result = await extractor.extract(
      "واحد اداری برای مزون میخوام حاشیه خیام"
    );
    
    expect(result.category.value).toContain('office');
    expect(result.transaction.type).toBe('RENT');
  });

  test('استخراج features ملک', async () => {
    const result = await extractor.extract(
      "آپارتمان 3 خواب با پارکینگ و آسانسور و انباری"
    );
    
    expect(result.property.hasParking).toBe(true);
    expect(result.property.hasElevator).toBe(true);
    expect(result.property.hasStorage).toBe(true);
  });
});
```

### Phase 6: Performance Optimization (بهینه‌سازی عملکرد)

#### Step 6.1: Caching Layer
```typescript
// فایل: src/intake/smart-extractor/cache/extraction-cache.ts

export class ExtractionCache {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 1000;
  private ttl: number = 60 * 60 * 1000; // 1 hour

  async get(key: string): Promise<SmartExtractionResult | null> {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  async set(key: string, data: SmartExtractionResult): Promise<void> {
    // LRU eviction
    if (this.memoryCache.size >= this.maxSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  generateKey(text: string, options: SmartExtractionOptions): string {
    const normalized = text.toLowerCase().trim();
    const optionsStr = JSON.stringify(options);
    return `${normalized}:${optionsStr}`;
  }

  clear(): void {
    this.memoryCache.clear();
  }

  getStats(): {
    size: number;
    hitRate: number;
    avgResponseTime: number;
  } {
    // آمار کش
    return {
      size: this.memoryCache.size,
      hitRate: 0, // محاسبه از لاگ
      avgResponseTime: 0 // محاسبه از لاگ
    };
  }
}

interface CacheEntry {
  data: SmartExtractionResult;
  timestamp: number;
}
```

### Phase 7: Integration & Deployment (ادغام و استقرار)

#### Step 7.1: API Endpoint جدید
```typescript
// فایل: src/app/api/intake/smart-extract/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { extractSmartFields } from '@/intake/smart-extractor/smart-field-extractor';
import { ExtractionCache } from '@/intake/smart-extractor/cache/extraction-cache';

const cache = new ExtractionCache();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { needText, detailsText, options } = body;

    // بررسی کش
    const cacheKey = cache.generateKey(needText + detailsText, options);
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return NextResponse.json({
        ...cached,
        fromCache: true
      });
    }

    // استخراج جدید
    const result = await extractSmartFields(
      needText,
      detailsText,
      options
    );

    // ذخیره در کش
    await cache.set(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Smart extraction failed:', error);
    return NextResponse.json(
      { error: 'Failed to extract fields' },
      { status: 500 }
    );
  }
}
```

#### Step 7.2: Monitoring & Analytics
```typescript
// فایل: src/intake/smart-extractor/monitoring/analytics.ts

export class ExtractionAnalytics {
  private metrics = {
    totalExtractions: 0,
    successfulExtractions: 0,
    failedExtractions: 0,
    avgExtractionTime: 0,
    fieldAccuracy: {},
    userCorrections: []
  };

  trackExtraction(
    input: string,
    result: SmartExtractionResult,
    timeMs: number
  ): void {
    this.metrics.totalExtractions++;
    
    if (result.validation.isComplete) {
      this.metrics.successfulExtractions++;
    }
    
    // Update average time
    this.metrics.avgExtractionTime = 
      (this.metrics.avgExtractionTime * (this.metrics.totalExtractions - 1) + timeMs) /
      this.metrics.totalExtractions;
    
    // Track field accuracy
    this.updateFieldAccuracy(result);
  }

  trackUserCorrection(
    field: string,
    extractedValue: any,
    correctedValue: any
  ): void {
    this.metrics.userCorrections.push({
      field,
      extractedValue,
      correctedValue,
      timestamp: Date.now()
    });
    
    // Update accuracy metrics
    this.updateAccuracyFromCorrection(field);
  }

  private updateFieldAccuracy(result: SmartExtractionResult): void {
    // محاسبه دقت هر فیلد
    const fields = ['category', 'location', 'transaction', 'budget', 'property'];
    
    for (const field of fields) {
      const confidence = result[field]?.confidence || 0;
      
      if (!this.metrics.fieldAccuracy[field]) {
        this.metrics.fieldAccuracy[field] = {
          count: 0,
          totalConfidence: 0,
          corrections: 0
        };
      }
      
      this.metrics.fieldAccuracy[field].count++;
      this.metrics.fieldAccuracy[field].totalConfidence += confidence;
    }
  }

  private updateAccuracyFromCorrection(field: string): void {
    if (this.metrics.fieldAccuracy[field]) {
      this.metrics.fieldAccuracy[field].corrections++;
    }
  }

  getReport(): any {
    return {
      ...this.metrics,
      accuracy: this.calculateOverallAccuracy(),
      fieldAccuracyReport: this.getFieldAccuracyReport()
    };
  }

  private calculateOverallAccuracy(): number {
    const total = this.metrics.totalExtractions;
    const corrections = this.metrics.userCorrections.length;
    
    if (total === 0) return 0;
    
    return ((total - corrections) / total) * 100;
  }

  private getFieldAccuracyReport(): any {
    const report = {};
    
    for (const [field, data] of Object.entries(this.metrics.fieldAccuracy)) {
      const fieldData = data as any;
      report[field] = {
        avgConfidence: fieldData.totalConfidence / fieldData.count,
        correctionRate: (fieldData.corrections / fieldData.count) * 100,
        accuracy: 100 - ((fieldData.corrections / fieldData.count) * 100)
      };
    }
    
    return report;
  }
}
```

## 📊 Expected Results (نتایج مورد انتظار)

### کارایی سیستم:
- **دقت استخراج**: بیش از 95% برای فیلدهای اصلی
- **زمان پاسخ**: کمتر از 200ms برای real-time extraction
- **نرخ تکمیل خودکار**: بیش از 85% فیلدها بدون دخالت کاربر

### بهبودهای UX:
1. کاهش زمان ثبت آگهی از 5 دقیقه به 30 ثانیه
2. کاهش نرخ خطا در انتخاب محله از 30% به 5%
3. افزایش رضایت کاربر از 70% به 95%

## 🛠️ دستورالعمل اجرا برای Cursor

### Pre-requisites:
```bash
# نصب dependencies
npm install lodash debounce
npm install string-similarity
npm install --save-dev @testing-library/react @testing-library/jest-dom jest
```

### مرحله 1: ایجاد فایل‌ها
1. تمام فایل‌های TypeScript بالا را در مسیرهای مشخص شده ایجاد کنید
2. فایل‌های موجود را backup بگیرید
3. تست‌های unit را بنویسید

### مرحله 2: Integration
1. `NeedIntakePanel.tsx` را برای استفاده از سیستم جدید update کنید
2. API routes جدید را اضافه کنید
3. Hooks جدید را به components متصل کنید

### مرحله 3: Testing
1. ابتدا 10 test case دستی را اجرا کنید
2. سپس 100 test case تولید شده را بررسی کنید
3. Performance benchmarks را اجرا کنید

### مرحله 4: Monitoring
1. Analytics dashboard را setup کنید
2. Error tracking را فعال کنید
3. User feedback loop را پیاده‌سازی کنید

## ⚠️ نکات مهم برای Cursor

1. **تدریجی پیش بروید**: ابتدا core engine را بسازید، سپس features را اضافه کنید
2. **هر مرحله را تست کنید**: قبل از رفتن به مرحله بعد
3. **از داده‌های واقعی استفاده کنید**: داده‌های محله‌ها و شهرها را از DB بخوانید
4. **Performance را monitor کنید**: هر تابع باید کمتر از 50ms اجرا شود
5. **Error handling**: همه جا try-catch و fallback داشته باشید

## 📈 Metrics برای موفقیت

### Technical Metrics:
- [ ] استخراج 95% فیلدها به صورت صحیح
- [ ] Response time < 200ms
- [ ] Zero runtime errors in production
- [ ] 100% test coverage for critical paths

### Business Metrics:
- [ ] کاهش 80% در زمان ثبت آگهی
- [ ] افزایش 50% در تعداد آگهی‌های کامل
- [ ] کاهش 90% در support tickets مربوط به انتخاب محله

## 🎯 Next Steps

پس از اجرای کامل این سیستم:
1. A/B testing برای مقایسه با سیستم قدیم
2. جمع‌آوری feedback از کاربران
3. Fine-tuning مدل AI بر اساس corrections کاربران
4. گسترش به زبان‌های دیگر (عربی، انگلیسی)

---

**این مستند آماده ارائه به Cursor برای اجرا است. Cursor باید مرحله به مرحله این دستورات را اجرا کند و نتیجه هر مرحله را گزارش دهد.**
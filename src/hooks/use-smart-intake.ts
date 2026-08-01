/**
 * Hook برای استفاده از Smart Field Extractor در UI
 * Real-time extraction با debouncing
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from 'lodash';
import { toast } from 'sonner';
import type {
  SmartExtractionResult,
  SmartExtractionOptions,
} from '@/intake/smart-extractor/types';
import type { NeedDraft } from '@/contracts/need-intake';

async function smartExtractApi(
  needText: string,
  detailsText: string,
  options: SmartExtractionOptions,
  signal?: AbortSignal
): Promise<SmartExtractionResult> {
  const res = await fetch('/api/intake/smart-extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ needText, detailsText, options }),
  });
  if (!res.ok) throw new Error(`smart-extract HTTP ${res.status}`);
  return (await res.json()) as SmartExtractionResult;
}

export interface UseSmartIntakeOptions {
  // تاخیر برای real-time extraction (ms)
  debounceDelay?: number;
  // شهر انتخابی کاربر
  preferredCity?: string;
  preferredCitySlug?: string;
  // آیا extraction خودکار انجام شود
  autoExtract?: boolean;
  // callback ها
  onExtractionComplete?: (result: SmartExtractionResult) => void;
  onFieldsUpdate?: (fields: Partial<NeedDraft>) => void;
}

export interface UseSmartIntakeReturn {
  // نتیجه extraction
  extractionResult: SmartExtractionResult | null;
  // در حال extract کردن
  isExtracting: boolean;
  // خطا
  error: string | null;
  // تابع extraction دستی
  extractNow: (needText: string, detailsText?: string) => Promise<SmartExtractionResult | null>;
  // تابع clear کردن
  clearExtraction: () => void;
  // آیا فیلدها کامل هستند
  isComplete: boolean;
  // فیلدهای missing
  missingFields: string[];
  // پیشنهادات
  suggestions: string[];
  // هشدارها
  warnings: string[];
  // تابع انتخاب از alternatives
  selectAlternative: (field: 'category' | 'location', index: number) => void;
  // تابع تایید disambiguation
  confirmDisambiguation: (field: 'location', selectedIndex: number) => void;
}

export function useSmartIntake(
  needText: string,
  detailsText: string = '',
  options: UseSmartIntakeOptions = {}
): UseSmartIntakeReturn {
  const {
    debounceDelay = 500,
    preferredCity,
    preferredCitySlug,
    autoExtract = true,
    onExtractionComplete,
    onFieldsUpdate
  } = options;

  const [extractionResult, setExtractionResult] = useState<SmartExtractionResult | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * تابع extraction
   */
  const performExtraction = useCallback(async (
    text: string,
    details: string,
    realTime: boolean = false
  ): Promise<SmartExtractionResult | null> => {
    // لغو درخواست قبلی
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // اگر متن خالی است
    if (!text.trim() && !details.trim()) {
      setExtractionResult(null);
      setError(null);
      return null;
    }

    // controller جدید
    abortControllerRef.current = new AbortController();

    setIsExtracting(true);
    setError(null);

    try {
      const extractOptions: SmartExtractionOptions = {
        preferredCity,
        preferredCitySlug,
        realTime,
        useAI: !realTime || text.length > 50, // در real-time فقط برای متن‌های طولانی AI استفاده کن
        useRules: true
      };

      const result = await smartExtractApi(text, details, extractOptions, abortControllerRef.current.signal);

      // اگر abort نشده
      if (!abortControllerRef.current.signal.aborted) {
        setExtractionResult(result);

        // callback ها
        if (onExtractionComplete) {
          onExtractionComplete(result);
        }

        if (onFieldsUpdate) {
          const fields = convertToNeedDraft(result);
          onFieldsUpdate(fields);
        }

        // نمایش هشدارها
        if (result.validation.warnings.length > 0) {
          result.validation.warnings.forEach(warning => {
            toast.warning(warning);
          });
        }
      }

      return result;

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errorMessage = err.message || 'خطا در استخراج اطلاعات';
        setError(errorMessage);
        toast.error(errorMessage);
      }
      return null;
    } finally {
      setIsExtracting(false);
    }
  }, [preferredCity, preferredCitySlug, onExtractionComplete, onFieldsUpdate]);

  const performExtractionRef = useRef(performExtraction);
  useEffect(() => {
    performExtractionRef.current = performExtraction;
  }, [performExtraction]);

  const debouncedExtractionRef = useRef<ReturnType<typeof debounce> | null>(null);

  useEffect(() => {
    const debounced = debounce((text: string, details: string) => {
      void performExtractionRef.current(text, details, true);
    }, debounceDelay);
    debouncedExtractionRef.current = debounced;
    return () => {
      debounced.cancel();
      if (debouncedExtractionRef.current === debounced) {
        debouncedExtractionRef.current = null;
      }
    };
  }, [debounceDelay]);

  /**
   * Effect برای auto extraction
   */
  useEffect(() => {
    if (!autoExtract) return;
    debouncedExtractionRef.current?.(needText, detailsText);
    return () => {
      debouncedExtractionRef.current?.cancel();
    };
  }, [needText, detailsText, autoExtract]);

  /**
   * تابع extraction دستی (بدون debounce)
   */
  const extractNow = useCallback(async (
    text: string,
    details: string = ''
  ): Promise<SmartExtractionResult | null> => {
    return performExtraction(text, details, false);
  }, [performExtraction]);

  /**
   * Clear کردن
   */
  const clearExtraction = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setExtractionResult(null);
    setError(null);
  }, []);

  /**
   * انتخاب از alternatives
   */
  const selectAlternative = useCallback((
    field: 'category' | 'location',
    index: number
  ) => {
    if (!extractionResult) return;

    setExtractionResult(prev => {
      if (!prev) return prev;

      const updated = { ...prev };

      if (field === 'category' && prev.category.alternatives?.[index]) {
        const selected = prev.category.alternatives[index];
        updated.category = {
          ...prev.category,
          value: selected.slug,
          confidence: selected.confidence
        };
      } else if (field === 'location' && prev.location.alternatives?.[index]) {
        const selected = prev.location.alternatives[index];
        updated.location = {
          ...prev.location,
          neighborhood: selected.neighborhood,
          neighborhoodSlug: selected.neighborhoodSlug,
          disambiguationNeeded: false
        };
      }

      // callback
      if (onFieldsUpdate) {
        const fields = convertToNeedDraft(updated);
        onFieldsUpdate(fields);
      }

      return updated;
    });

    toast.success('انتخاب شما ثبت شد');
  }, [extractionResult, onFieldsUpdate]);

  /**
   * تایید disambiguation
   */
  const confirmDisambiguation = useCallback((
    field: 'location',
    selectedIndex: number
  ) => {
    selectAlternative(field, selectedIndex);
  }, [selectAlternative]);

  // محاسبه وضعیت
  const isComplete = extractionResult?.validation.isComplete || false;
  const missingFields = extractionResult?.validation.missingFields || [];
  const suggestions = extractionResult?.validation.suggestions || [];
  const warnings = extractionResult?.validation.warnings || [];

  return {
    extractionResult,
    isExtracting,
    error,
    extractNow,
    clearExtraction,
    isComplete,
    missingFields,
    suggestions,
    warnings,
    selectAlternative,
    confirmDisambiguation
  };
}

/**
 * Map SmartExtractionResult into a NeedDraft patch (entities + answers).
 */
function convertToNeedDraft(result: SmartExtractionResult): Partial<NeedDraft> {
  const entities: Record<string, unknown> = {};
  const answers: Record<string, string | number | boolean | string[]> = {};

  if (result.category.value) {
    entities.categorySlug = result.category.value;
    if (result.category.subcategory) {
      entities.subcategorySlug = result.category.subcategory;
    }
  }

  if (result.location.city) {
    entities.city = result.location.city;
    if (result.location.citySlug) entities.citySlug = result.location.citySlug;
  }

  if (result.location.neighborhood) {
    entities.neighborhood = result.location.neighborhood;
    if (result.location.neighborhoodSlug) {
      entities.neighborhoodSlug = result.location.neighborhoodSlug;
    }
  }

  if (result.transaction.type) {
    entities.transactionType = result.transaction.type;
  }
  if (result.transaction.dealType) {
    answers.dealType = result.transaction.dealType;
  }

  if (result.budget.min != null) entities.budgetMin = result.budget.min;
  if (result.budget.max != null) entities.budgetMax = result.budget.max;
  if (result.budget.depositAmount != null) {
    answers.rahnAmount = result.budget.depositAmount;
    answers.deposit = result.budget.depositAmount;
  }
  if (result.budget.rentAmount != null) {
    answers.monthlyRent = result.budget.rentAmount;
  }

  if (result.property.area != null) entities.area = result.property.area;
  if (result.property.rooms != null) entities.rooms = result.property.rooms;

  const features: string[] = [];
  if (result.property.hasParking) features.push('parking');
  if (result.property.hasElevator) features.push('elevator');
  if (result.property.hasStorage) features.push('storage');
  if (features.length > 0) answers.features = features;

  const title = result.metadata.needTitle?.trim();
  const description = result.metadata.needDescription?.trim();
  const listingPreview =
    title || description
      ? {
          title: title || '',
          description: description || '',
        }
      : undefined;

  return {
    ...(result.category.value ? { category: result.category.value } : {}),
    entities,
    answers,
    ...(listingPreview ? { listingPreview } : {}),
  };
}

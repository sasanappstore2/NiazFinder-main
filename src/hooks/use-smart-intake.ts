/**
 * Hook برای استفاده از Smart Field Extractor در UI
 * Real-time extraction با debouncing
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

  /**
   * Debounced extraction برای real-time
   */
  const debouncedExtraction = useMemo(
    () => debounce((text: string, details: string) => {
      performExtraction(text, details, true);
    }, debounceDelay),
    [performExtraction, debounceDelay]
  );

  /**
   * Effect برای auto extraction
   */
  useEffect(() => {
    if (autoExtract) {
      debouncedExtraction(needText, detailsText);
    }

    return () => {
      debouncedExtraction.cancel();
    };
  }, [needText, detailsText, autoExtract, debouncedExtraction]);

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
 * تبدیل نتیجه extraction به NeedDraft
 */
function convertToNeedDraft(result: SmartExtractionResult): Partial<NeedDraft> {
  const draft: Partial<NeedDraft> = {};

  // Category
  if (result.category.value) {
    draft.categorySlug = result.category.value;
    draft.subcategorySlug = result.category.subcategory || undefined;
  }

  // Location
  if (result.location.city) {
    draft.city = result.location.city;
    draft.citySlug = result.location.citySlug || undefined;
  }

  if (result.location.neighborhood) {
    draft.neighborhood = result.location.neighborhood;
    draft.neighborhoodSlug = result.location.neighborhoodSlug || undefined;
  }

  // Transaction
  if (result.transaction.type) {
    draft.transactionType = result.transaction.type;
    draft.dealType = result.transaction.dealType;
  }

  // Budget
  if (result.budget.min !== null || result.budget.max !== null) {
    draft.budgetMin = result.budget.min || undefined;
    draft.budgetMax = result.budget.max || undefined;
  }

  if (result.budget.depositAmount !== undefined) {
    draft.depositAmount = result.budget.depositAmount;
  }

  if (result.budget.rentAmount !== undefined) {
    draft.rentAmount = result.budget.rentAmount;
  }

  // Property
  if (result.property.area) {
    draft.area = result.property.area;
  }

  if (result.property.rooms) {
    draft.rooms = result.property.rooms;
  }

  // Features
  const features = [];
  if (result.property.hasParking) features.push('parking');
  if (result.property.hasElevator) features.push('elevator');
  if (result.property.hasStorage) features.push('storage');

  if (features.length > 0) {
    draft.features = features;
  }

  // Metadata
  if (result.metadata.needTitle) {
    draft.title = result.metadata.needTitle;
  }

  if (result.metadata.needDescription) {
    draft.description = result.metadata.needDescription;
  }

  if (result.metadata.urgency) {
    draft.urgency = result.metadata.urgency;
  }

  return draft;
}
import {
  canProceedToIntakeLocation,
} from '@/lib/need-intake/compose-source-text';

export type IntakeComposeReadinessLevel = 'empty' | 'low' | 'ok' | 'great';

export interface IntakeComposeReadiness {
  level: IntakeComposeReadinessLevel;
  label: string;
  progress: number;
  canProceed: boolean;
}

const COMPOSE_MIN_HINT_CHARS = 12;

export function getIntakeComposeReadiness(
  needText: string,
  detailsText: string,
  prefetchReady: boolean
): IntakeComposeReadiness {
  const needLen = needText.trim().length;
  const hasDetails = detailsText.trim().length > 0;
  const canProceed = canProceedToIntakeLocation(needText, detailsText);

  if (needLen === 0 && !hasDetails) {
    return {
      level: 'empty',
      label: 'یک جمله کوتاه بنویسید — مثلاً «ویولون نو می‌خواهم در تهران»',
      progress: 0,
      canProceed: false,
    };
  }

  if (canProceed) {
    return {
      level: 'great',
      label: prefetchReady
        ? 'عالی — تحلیل آماده است'
        : 'عالی — می‌توانید ادامه دهید',
      progress: 100,
      canProceed: true,
    };
  }

  if (needLen >= COMPOSE_MIN_HINT_CHARS) {
    return {
      level: 'ok',
      label: 'کمی بیشتر بنویسید یا جزئیات اختیاری را پر کنید',
      progress: Math.min(85, Math.round((needLen / 25) * 100)),
      canProceed: false,
    };
  }

  return {
    level: 'low',
    label: 'حداقل یک جمله کامل بنویسید',
    progress: Math.round((needLen / COMPOSE_MIN_HINT_CHARS) * 40),
    canProceed: false,
  };
}

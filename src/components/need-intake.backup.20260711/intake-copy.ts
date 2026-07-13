/** Centralized Persian UI strings for need intake (UTF-8). */

import type { IntakeAnalysisMode } from '@/lib/intake/rules-only-mode';

export const INTAKE_COPY = {
  stepOf: (current: number, total: number) => `مرحله ${current} از ${total}`,
  stagedBadge: 'ثبت نیاز مرحله‌ای',
  charUnit: 'کاراکتر',
  charsRemaining: (n: string | number) => `${n} کاراکتر مانده`,
  charsEnough: 'کافی است',
  composerHintAi: 'هوش مصنوعی در حال استخراج intent و جزئیات نیاز شماست…',
  composerHintRules: 'در حال تحلیل سریع نیاز و استخراج جزئیات از متن…',
  analyzingNeedAi: 'در حال تحلیل نیاز شما با هوش مصنوعی…',
  analyzingNeedRules: 'در حال تحلیل سریع نیاز شما…',
  aiUnderstandingTitle: 'درک هوش مصنوعی از نیاز شما',
  rulesUnderstandingTitle: 'تحلیل سریع نیاز شما',
  aiUnderstandingLoading: 'در حال استخراج intent، دسته، مکان و بودجه از متن…',
  rulesUnderstandingLoading: 'در حال استخراج دسته، مکان و بودجه از متن…',
  aiUnderstandingFootnote: 'این خلاصه به سیستم کمک می‌کند فرم بعدی را دقیق‌تر پیشنهاد دهد.',
  rulesUnderstandingFootnote: 'این پیشنهادها از قوانین استخراج شده‌اند؛ در صورت نیاز اصلاح کنید.',
  aiUnderstandingEmpty: 'متن نیاز را بنویسید تا تحلیل شود.',
  stepComposeDescription:
    'نیازتان را بنویسید؛ پیشنهادهای دسته، مکان و بودجه را همین‌جا ببینید و اصلاح کنید.',
  stepComposeTitle: 'نوشتن نیاز',
  stepFormTitle: 'تکمیل فرم',
  stepFormDescription: 'دسته، مکان، بودجه و مشخصات را تایید یا تکمیل کنید.',
  stepPreviewTitle: 'پیش‌نمایش و انتشار',
  detailsMoreToggle: 'توضیح بیشتر (اختیاری)',
  detailsMorePlaceholder: 'مثلاً: دو خواب، نزدیک مترو، اولویت با نورگیر…',
  homeSeedBanner: 'متن شما از صفحه اصلی منتقل شد',
  liveListingTitle: 'پیش‌نمایش زندهٔ عنوان',
  liveSummaryTitle: 'خلاصه زنده',
  liveSummaryEmptyAi: 'پس از نوشتن نیاز، خلاصه هوش مصنوعی اینجا نمایش داده می‌شود.',
  liveSummaryEmptyRules: 'پس از نوشتن نیاز، خلاصه تحلیل اینجا نمایش داده می‌شود.',
  liveSummaryAria: 'مشاهده خلاصه زنده',
  publishingAria: 'در حال انتشار نیاز',
  publishingTitle: 'در حال انتشار آگهی',
  publishingSubtitle: 'لطفاً چند لحظه صبر کنید',
  timelineAria: 'مراحل ثبت نیاز',
  progressAria: 'پیشرفت مراحل ثبت نیاز',
  timelineCompose: 'نوشتن نیاز',
  timelineForm: 'تکمیل فرم',
  timelinePreview: 'پیش‌نمایش',
  continueToForm: 'ادامه به تکمیل فرم',
  analyzingContinue: 'در حال تحلیل…',
  chipConfirmHint: 'برای تایید یا اصلاح ضربه بزنید',
} as const;

/** Honest composer / loading copy based on configured analysis mode. */
export function intakeComposerHint(mode: IntakeAnalysisMode): string {
  return mode === 'ai' ? INTAKE_COPY.composerHintAi : INTAKE_COPY.composerHintRules;
}

export function intakeAnalyzingNeed(mode: IntakeAnalysisMode): string {
  return mode === 'ai' ? INTAKE_COPY.analyzingNeedAi : INTAKE_COPY.analyzingNeedRules;
}

export function intakeUnderstandingTitle(
  mode: IntakeAnalysisMode,
  aiInvoked?: boolean
): string {
  if (aiInvoked || mode === 'ai') return INTAKE_COPY.aiUnderstandingTitle;
  return INTAKE_COPY.rulesUnderstandingTitle;
}

export function intakeUnderstandingLoading(mode: IntakeAnalysisMode): string {
  return mode === 'ai' ? INTAKE_COPY.aiUnderstandingLoading : INTAKE_COPY.rulesUnderstandingLoading;
}

export function intakeUnderstandingFootnote(
  mode: IntakeAnalysisMode,
  aiInvoked?: boolean
): string {
  if (aiInvoked || mode === 'ai') return INTAKE_COPY.aiUnderstandingFootnote;
  return INTAKE_COPY.rulesUnderstandingFootnote;
}

export function intakeLiveSummaryEmpty(mode: IntakeAnalysisMode): string {
  return mode === 'ai' ? INTAKE_COPY.liveSummaryEmptyAi : INTAKE_COPY.liveSummaryEmptyRules;
}

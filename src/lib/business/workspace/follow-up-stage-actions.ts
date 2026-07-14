import type { FollowUpStageId } from '@/components/workspace/types';

export type FollowUpQuickReminderPreset = {
  id: string;
  label: string;
  /** Minutes from now, or a named slot */
  offset: number | 'tomorrow10' | 'tomorrow14' | 'in3days';
};

export type FollowUpStageActionConfig = {
  hint: string;
  notePlaceholder: string;
  quickReminders: FollowUpQuickReminderPreset[];
};

export const FOLLOW_UP_STAGE_ACTIONS: Record<FollowUpStageId, FollowUpStageActionConfig> = {
  new: {
    hint: 'تماس اولیه را برنامه‌ریزی کنید و یادداشت اولیه بگذارید.',
    notePlaceholder: 'مثلاً: مشتری به واحد ۱۳۰ متری علاقه‌مند است، فردا تماس بگیرم...',
    quickReminders: [
      { id: '1h', label: '۱ ساعت دیگر', offset: 60 },
      { id: '3h', label: '۳ ساعت دیگر', offset: 180 },
      { id: 'tomorrow10', label: 'فردا ۱۰ صبح', offset: 'tomorrow10' },
    ],
  },
  contacted: {
    hint: 'نتیجه تماس را ثبت کنید و در صورت نیاز زمان بازدید را یادآوری کنید.',
    notePlaceholder: 'مثلاً: تماس گرفته شد، مشتری فردا برای بازدید وقت دارد...',
    quickReminders: [
      { id: '2h', label: '۲ ساعت دیگر', offset: 120 },
      { id: 'tomorrow14', label: 'فردا ۱۴', offset: 'tomorrow14' },
      { id: 'in3days', label: '۳ روز دیگر', offset: 'in3days' },
    ],
  },
  visited: {
    hint: 'بازدید را ثبت کنید و قدم بعدی (مذاکره یا پیگیری) را مشخص کنید.',
    notePlaceholder: 'مثلاً: بازدید انجام شد، واحد مورد تأیید بود، منتظر پیشنهاد قیمت...',
    quickReminders: [
      { id: 'tomorrow10', label: 'فردا ۱۰ صبح', offset: 'tomorrow10' },
      { id: 'in3days', label: '۳ روز دیگر', offset: 'in3days' },
      { id: '1w', label: '۱ هفته دیگر', offset: 60 * 24 * 7 },
    ],
  },
  negotiating: {
    hint: 'جزئیات مذاکره و مهلت تصمیم را یادداشت کنید.',
    notePlaceholder: 'مثلاً: پیشنهاد ۲ میلیارد داده شد، مشتری تا پنجشنبه جواب می‌دهد...',
    quickReminders: [
      { id: 'tomorrow10', label: 'فردا ۱۰ صبح', offset: 'tomorrow10' },
      { id: '2d', label: '۲ روز دیگر', offset: 60 * 24 * 2 },
      { id: 'in3days', label: '۳ روز دیگر', offset: 'in3days' },
    ],
  },
  closed: {
    hint: 'نتیجه نهایی معامله را ثبت کنید.',
    notePlaceholder: 'مثلاً: معامله بسته شد / مشتری منصرف شد / به رقیب رفت...',
    quickReminders: [],
  },
};

export function computeReminderDueAt(offset: FollowUpQuickReminderPreset['offset']): Date {
  const now = new Date();

  if (offset === 'tomorrow10') {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  }

  if (offset === 'tomorrow14') {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(14, 0, 0, 0);
    return d;
  }

  if (offset === 'in3days') {
    const d = new Date(now);
    d.setDate(d.getDate() + 3);
    d.setHours(10, 0, 0, 0);
    return d;
  }

  return new Date(now.getTime() + offset * 60 * 1000);
}

export function formatReminderDue(dueAt: string): string {
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return dueAt;

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `امروز ${time}`;
  if (isTomorrow) return `فردا ${time}`;
  return date.toLocaleString('fa-IR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isReminderOverdue(dueAt: string): boolean {
  const due = new Date(dueAt).getTime();
  return !Number.isNaN(due) && due < Date.now();
}

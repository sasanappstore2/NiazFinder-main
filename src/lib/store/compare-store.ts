// حداکثر تعداد متخصص‌های قابل مقایسه
const MAX_COMPARE_COUNT = 3;

export interface CompareState {
  // لیست شناسه متخصص‌های انتخاب شده برای مقایسه
  compareSpecialistIds: string[];
  // اضافه/حذف متخصص از لیست مقایسه
  toggleCompareSpecialist: (id: string) => boolean; // برمی‌گرداند آیا اضافه شد
  clearCompareList: () => void;
  // بررسی وضعیت
  isInCompare: (id: string) => boolean;
  isCompareFull: () => boolean;
  getCompareCount: () => number;
  // پاک‌سازی همه متخصص‌ها و اضافه کردن مجموعه جدید
  setCompareList: (ids: string[]) => void;
}

export const createCompareStore = (
  set: (fn: (state: CompareState) => Partial<CompareState>) => void,
  get: () => CompareState,
): CompareState => ({
  compareSpecialistIds: [],

  toggleCompareSpecialist: (id: string): boolean => {
    const { compareSpecialistIds } = get();

    if (compareSpecialistIds.includes(id)) {
      // حذف از لیست مقایسه
      set({
        compareSpecialistIds: compareSpecialistIds.filter((sId) => sId !== id),
      });
      return false;
    }

    // بررسی محدودیت تعداد
    if (compareSpecialistIds.length >= MAX_COMPARE_COUNT) {
      // لیست پر شده - متخصص اضافه نمی‌شود
      return false;
    }

    // اضافه به لیست مقایسه
    set({
      compareSpecialistIds: [...compareSpecialistIds, id],
    });
    return true;
  },

  clearCompareList: () => {
    set({ compareSpecialistIds: [] });
  },

  isInCompare: (id: string): boolean => {
    return get().compareSpecialistIds.includes(id);
  },

  isCompareFull: (): boolean => {
    return get().compareSpecialistIds.length >= MAX_COMPARE_COUNT;
  },

  getCompareCount: (): number => {
    return get().compareSpecialistIds.length;
  },

  setCompareList: (ids: string[]) => {
    const filtered = ids.slice(0, MAX_COMPARE_COUNT);
    set({ compareSpecialistIds: filtered });
  },
});

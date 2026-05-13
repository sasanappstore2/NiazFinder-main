// کلیدهای ذخیره‌سازی در localStorage
const BOOKMARK_REQUESTS_KEY = 'nf_bookmarked_requests';
const BOOKMARK_SPECIALISTS_KEY = 'nf_bookmarked_specialists';

export interface BookmarkState {
  // لیست شناسه درخواست‌های نشان شده
  bookmarkedRequests: string[];
  // لیست شناسه متخصص‌های نشان شده
  bookmarkedSpecialists: string[];
  // توابع مدیریت نشان‌ها
  toggleBookmarkRequest: (id: string) => void;
  toggleBookmarkSpecialist: (id: string) => void;
  isRequestBookmarked: (id: string) => boolean;
  isSpecialistBookmarked: (id: string) => boolean;
  // ذخیره‌سازی و بازیابی از localStorage
  syncFromStorage: () => void;
  clearAllBookmarks: () => void;
  getBookmarkCount: () => number;
}

// خواندن لیست از localStorage
function loadArrayFromStorage(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // در صورت خطا، آرایه خالی برمی‌گرداند
  }
  return [];
}

// ذخیره لیست در localStorage
function saveArrayToStorage(key: string, arr: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    // در صورت خطا در ذخیره‌سازی، ساکت می‌مانیم
  }
}

export const createBookmarkStore = (
  set: (fn: (state: BookmarkState) => Partial<BookmarkState>) => void,
  get: () => BookmarkState,
): BookmarkState => ({
  bookmarkedRequests: [],
  bookmarkedSpecialists: [],

  toggleBookmarkRequest: (id: string) => {
    const current = get().bookmarkedRequests;
    const updated = current.includes(id)
      ? current.filter((rId) => rId !== id)
      : [...current, id];

    set({ bookmarkedRequests: updated });
    saveArrayToStorage(BOOKMARK_REQUESTS_KEY, updated);
  },

  toggleBookmarkSpecialist: (id: string) => {
    const current = get().bookmarkedSpecialists;
    const updated = current.includes(id)
      ? current.filter((sId) => sId !== id)
      : [...current, id];

    set({ bookmarkedSpecialists: updated });
    saveArrayToStorage(BOOKMARK_SPECIALISTS_KEY, updated);
  },

  isRequestBookmarked: (id: string): boolean => {
    return get().bookmarkedRequests.includes(id);
  },

  isSpecialistBookmarked: (id: string): boolean => {
    return get().bookmarkedSpecialists.includes(id);
  },

  // بازیابی نشان‌ها از ذخیره‌سازی محلی هنگام بارگذاری اولیه
  syncFromStorage: () => {
    const requests = loadArrayFromStorage(BOOKMARK_REQUESTS_KEY);
    const specialists = loadArrayFromStorage(BOOKMARK_SPECIALISTS_KEY);
    set({
      bookmarkedRequests: requests,
      bookmarkedSpecialists: specialists,
    });
  },

  clearAllBookmarks: () => {
    set({ bookmarkedRequests: [], bookmarkedSpecialists: [] });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(BOOKMARK_REQUESTS_KEY);
      localStorage.removeItem(BOOKMARK_SPECIALISTS_KEY);
    }
  },

  getBookmarkCount: (): number => {
    const { bookmarkedRequests, bookmarkedSpecialists } = get();
    return bookmarkedRequests.length + bookmarkedSpecialists.length;
  },
});

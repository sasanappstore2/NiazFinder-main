import type { AppView } from '@/lib/types';
import { ROUTES } from '@/lib/route-config';

// رابط مربوط به آیتم‌های تاریخچه ناوبری
export interface NavigationHistoryEntry {
  view: AppView;
  params: Record<string, string>;
  timestamp: number;
}

// حداکثر تعداد آیتم‌های قابل ذخیره در تاریخچه ناوبری
const MAX_HISTORY_SIZE = 50;

// نگاشت معکوس از مسیرها به نماها (hash → view)
const HASH_TO_VIEW_MAP: Record<string, AppView> = {
  '': 'home',
  '/': 'home',
  '/login': 'login',
  '/register': 'register',
  '/requests': 'browse-requests',
  '/requests/new': 'post-need',
  '/specialists': 'browse-specialists',
  '/dashboard': 'dashboard',
  '/dashboard/settings': 'dashboard',
  '/dashboard/profile': 'profile',
  '/dashboard/requests': 'dashboard',
  '/dashboard/payments': 'dashboard',
  '/dashboard/referral': 'referral',
  '/dashboard/settings/notifications': 'notification-settings',
  '/chat': 'messages',
  '/chat/new': 'messages',
  '/notifications': 'notifications',
  '/admin': 'admin',
  '/pricing': 'pricing',
  '/compare': 'compare-specialists',
};

// نگاشت نما به مسیر (view → route)
const VIEW_TO_ROUTE_MAP: Record<string, string> = {
  home: ROUTES.home,
  login: ROUTES.login,
  register: ROUTES.register,
  'post-need': ROUTES.postNeed,
  'browse-requests': ROUTES.browseRequests,
  'request-detail': ROUTES.requestDetail,
  'browse-specialists': ROUTES.browseSpecialists,
  'specialist-profile': ROUTES.specialistProfile,
  dashboard: ROUTES.dashboard,
  messages: ROUTES.messages,
  notifications: ROUTES.notifications,
  admin: ROUTES.admin,
  profile: ROUTES.profile,
  pricing: ROUTES.pricing,
  'compare-specialists': ROUTES.compareSpecialists,
  'submit-proposal': ROUTES.submitProposal,
  'submit-review': ROUTES.submitReview,
  referral: ROUTES.referral,
  'notification-settings': ROUTES.notificationSettings,
};

export interface NavigationState {
  currentView: AppView;
  viewParams: Record<string, string>;
  previousView: AppView | null;
  // پشته تاریخچه ناوبری - هر آیتم شامل نما، پارامترها و زمان‌ stamp است
  history: NavigationHistoryEntry[];
  navigateTo: (view: AppView, params?: Record<string, string>) => void;
  goBack: () => void;
  // تبدیل هش URL به نما و بارگذاری آن
  parseHash: (hash: string) => { view: AppView; params: Record<string, string> };
  // تبدیل نما و پارامترها به هش URL
  toHash: (view: AppView, params?: Record<string, string>) => string;
  // آیتم‌های تاریخچه را پاک می‌کند
  clearHistory: () => void;
}

export const createNavigationStore = (set: (fn: (state: NavigationState) => Partial<NavigationState>) => void, get: () => NavigationState): NavigationState => ({
  currentView: 'home',
  viewParams: {},
  previousView: null,
  history: [],

  parseHash: (hash: string): { view: AppView; params: Record<string, string> } => {
    // هش را پاک‌سازی و تجزیه می‌کند
    const cleanHash = hash.replace(/^#\/?/, '');
    const [pathPart, queryPart] = cleanHash.split('?');
    const query = new URLSearchParams(queryPart || '');

    // مسیر و پارامترها را استخراج می‌کند
    const segments = pathPart.split('/').filter(Boolean);
    let view: AppView = 'home';
    const params: Record<string, string> = {};

    // بررسی مسیرهای ساده
    const simplePath = `/${segments.join('/')}`;
    if (HASH_TO_VIEW_MAP[simplePath]) {
      view = HASH_TO_VIEW_MAP[simplePath];
    } else if (segments[0] === 'requests' && segments[1] && segments.length === 2) {
      view = 'request-detail';
      params.slug = segments[1];
    } else if (segments[0] === 'specialists' && segments[1] && segments.length === 2) {
      view = 'specialist-profile';
      params.id = segments[1];
    } else if (segments[0] === 'chat' && segments[1] && segments.length === 2) {
      view = 'messages';
      params.conversationId = segments[1];
    } else if (segments[0] === 'requests' && segments[1] && segments[2] === 'propose') {
      view = 'submit-proposal';
      params.slug = segments[1];
    } else if (segments[0] === 'specialists' && segments[1] && segments[2] === 'review') {
      view = 'submit-review';
      params.id = segments[1];
    }

    // پارامترهای کوئری استرینگ را اضافه می‌کند
    query.forEach((value, key) => {
      params[key] = value;
    });

    return { view, params };
  },

  toHash: (view: AppView, params: Record<string, string> = {}): string => {
    let routeTemplate = VIEW_TO_ROUTE_MAP[view] || '/';
    let hash = routeTemplate;

    // جایگذاری پارامترهای پویا در مسیر
    if (params.slug) {
      hash = hash.replace('[slug]', params.slug);
    }
    if (params.id) {
      hash = hash.replace('[id]', params.id);
    }
    if (params.conversationId) {
      hash = hash.replace('[conversationId]', params.conversationId);
    }

    // پارامترهای اضافی را به کوئری استرینگ تبدیل می‌کند
    const pathParams = new Set(['slug', 'id', 'conversationId']);
    const queryParams = Object.entries(params).filter(([key]) => !pathParams.has(key));
    if (queryParams.length > 0) {
      const qs = queryParams.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      hash += `?${qs}`;
    }

    // حذف اسلش اول برای هش
    return hash.startsWith('/') ? `#${hash}` : `#/${hash}`;
  },

  navigateTo: (view: AppView, params: Record<string, string> = {}) => {
    const { currentView, viewParams } = get();

    // ثبت در تاریخچه ناوبری
    const entry: NavigationHistoryEntry = {
      view: currentView,
      params: { ...viewParams },
      timestamp: Date.now(),
    };

    set((state) => ({
      previousView: currentView,
      currentView: view,
      viewParams: params,
      history: [...state.history.slice(-(MAX_HISTORY_SIZE - 1)), entry],
    }));

    // به‌روزرسانی هش مرورگر برای پشتیبانی از deep linking
    const hash = get().toHash(view, params);
    if (window.location.hash !== hash) {
      window.history.pushState(null, '', hash);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  goBack: () => {
    const { history } = get();

    if (history.length > 0) {
      const lastEntry = history[history.length - 1];
      set((state) => ({
        currentView: lastEntry.view,
        viewParams: lastEntry.params,
        previousView: state.currentView,
        history: state.history.slice(0, -1),
      }));

      const hash = get().toHash(lastEntry.view, lastEntry.params);
      window.history.pushState(null, '', hash);
    } else {
      set({ currentView: 'home', previousView: null, viewParams: {} });
      window.history.pushState(null, '', '#/');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  clearHistory: () => {
    set({ history: [] });
  },
});

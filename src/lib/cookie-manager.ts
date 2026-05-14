import type { City } from './location-system';

export interface UserPreferences {
  location: {
    selectedCities: City[];
    lastUpdated: number;
  };
  filters: {
    category: string;
    sort: 'newest' | 'oldest';
    neighborhood: string | null;
    specificFilters: Record<string, unknown>;
    lastUpdated: number;
  };
  ui: {
    theme: 'light' | 'dark' | 'system';
    language: 'fa' | 'en';
    lastUpdated: number;
  };
  lastVisit: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  location: {
    selectedCities: [],
    lastUpdated: 0,
  },
  filters: {
    category: 'all',
    sort: 'newest',
    neighborhood: null,
    specificFilters: {},
    lastUpdated: 0,
  },
  ui: {
    theme: 'system',
    language: 'fa',
    lastUpdated: 0,
  },
  lastVisit: Date.now(),
};

const COOKIE_CONFIG = {
  name: 'needfinder_prefs',
  maxAge: 365 * 24 * 60 * 60 * 1000,
  secure: typeof process !== 'undefined' && process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export class CookieManager {
  private static instance: CookieManager;
  private preferences: UserPreferences | null = null;

  private constructor() {
    this.loadPreferences();
  }

  public static getInstance(): CookieManager {
    if (!CookieManager.instance) {
      CookieManager.instance = new CookieManager();
    }
    return CookieManager.instance;
  }

  private loadPreferences(): void {
    if (typeof window === 'undefined') return;

    try {
      const cookieValue = this.getCookie(COOKIE_CONFIG.name);
      if (cookieValue) {
        const parsed = JSON.parse(decodeURIComponent(cookieValue));
        this.preferences = { ...DEFAULT_PREFERENCES, ...parsed };
      } else {
        this.preferences = { ...DEFAULT_PREFERENCES };
      }
    } catch (error) {
      console.warn('Failed to load preferences:', error);
      this.preferences = { ...DEFAULT_PREFERENCES };
    }
  }

  private savePreferences(): void {
    if (typeof window === 'undefined' || !this.preferences) return;

    try {
      const cookieValue = encodeURIComponent(JSON.stringify(this.preferences));
      this.setCookie(COOKIE_CONFIG.name, cookieValue, COOKIE_CONFIG);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }

  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;

    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  private setCookie(name: string, value: string, options: Record<string, unknown>): void {
    if (typeof document === 'undefined') return;

    let cookieString = `${name}=${value}`;

    if (options.maxAge) {
      cookieString += `; max-age=${Math.floor(options.maxAge as number / 1000)}`;
    }

    if (options.path) {
      cookieString += `; path=${options.path}`;
    }

    if (options.secure) {
      cookieString += '; secure';
    }

    if (options.sameSite) {
      cookieString += `; samesite=${options.sameSite}`;
    }

    document.cookie = cookieString;
  }

  public getPreferences(): UserPreferences {
    if (!this.preferences) {
      this.loadPreferences();
    }
    return this.preferences || { ...DEFAULT_PREFERENCES };
  }

  public updateLocation(selectedCities: City[]): void {
    if (!this.preferences) {
      this.preferences = { ...DEFAULT_PREFERENCES };
    }

    this.preferences.location = {
      selectedCities,
      lastUpdated: Date.now(),
    };

    this.savePreferences();
  }

  public updateFilters(filters: Partial<UserPreferences['filters']>): void {
    if (!this.preferences) {
      this.preferences = { ...DEFAULT_PREFERENCES };
    }

    this.preferences.filters = {
      ...this.preferences.filters,
      ...filters,
      lastUpdated: Date.now(),
    };

    this.savePreferences();
  }

  public updateUI(ui: Partial<UserPreferences['ui']>): void {
    if (!this.preferences) {
      this.preferences = { ...DEFAULT_PREFERENCES };
    }

    this.preferences.ui = {
      ...this.preferences.ui,
      ...ui,
      lastUpdated: Date.now(),
    };

    this.savePreferences();
  }

  public updateLastVisit(): void {
    if (!this.preferences) {
      this.preferences = { ...DEFAULT_PREFERENCES };
    }

    this.preferences.lastVisit = Date.now();
    this.savePreferences();
  }

  public reset(): void {
    this.preferences = { ...DEFAULT_PREFERENCES };
    if (typeof document !== 'undefined') {
      document.cookie = `${COOKIE_CONFIG.name}=; path=${COOKIE_CONFIG.path}; max-age=0`;
    }
  }
}

export const cookieManager = CookieManager.getInstance();

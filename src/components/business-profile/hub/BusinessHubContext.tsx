'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';
import {
  computeBusinessProfileCompletion,
  type ProfileCompletionResult,
} from '@/lib/business/profile-completion';
import type { BusinessHubProfile, BusinessHubProfilePatch, HubTaskId } from './types';

type BusinessHubContextValue = {
  profile: BusinessHubProfile | null;
  loading: boolean;
  refreshing: boolean;
  completion: ProfileCompletionResult | null;
  refresh: () => Promise<void>;
  patchProfile: (patch: BusinessHubProfilePatch) => void;
  activeTask: HubTaskId;
  setActiveTask: (task: HubTaskId) => void;
};

const BusinessHubContext = createContext<BusinessHubContextValue | null>(null);

function mapApiToProfile(data: Record<string, unknown>): BusinessHubProfile {
  const occupationSlugs = (data.occupationSlugs as string[] | undefined) ?? [];
  const primary =
    (data.primaryCategorySlug as string | null | undefined) ??
    (data.primaryOccupationSlug as string | null | undefined) ??
    occupationSlugs[0] ??
    null;

  return {
    slug: String(data.slug ?? ''),
    name: String(data.name ?? ''),
    logo: String(data.logo ?? ''),
    coverImage: String(data.coverImage ?? ''),
    description: String(data.description ?? ''),
    categorySlugs: (data.categorySlugs as string[] | undefined) ?? occupationSlugs,
    occupationSlugs,
    primaryCategorySlug: primary,
    city: String(data.city ?? ''),
    province: String(data.province ?? ''),
    address: String(data.address ?? ''),
    lat: typeof data.lat === 'number' ? data.lat : null,
    lng: typeof data.lng === 'number' ? data.lng : null,
    phone: String(data.phone ?? ''),
    whatsapp: String(data.whatsapp ?? ''),
    email: String(data.email ?? ''),
    chatEnabled: Boolean(data.chatEnabled ?? true),
    seoTitle: String(data.seoTitle ?? ''),
    seoDescription: String(data.seoDescription ?? ''),
    website: String(data.website ?? ''),
    instagram: String(data.instagram ?? ''),
    telegram: String(data.telegram ?? ''),
    bale: String(data.bale ?? ''),
    rubika: String(data.rubika ?? ''),
    eitaa: String(data.eitaa ?? ''),
    verified: Boolean(data.verified),
    viewCount: Number(data.viewCount ?? 0),
    publicUrl: String(data.publicUrl ?? ''),
    suggestedProfileSlug:
      data.suggestedProfileSlug === null || data.suggestedProfileSlug === undefined
        ? null
        : String(data.suggestedProfileSlug),
    onboardingCompleted: Boolean(data.onboardingCompleted),
    offerCount: Number(data.offerCount ?? 0),
    portfolioCount: Number(data.portfolioCount ?? 0),
    storefrontCategoryCount: Number(data.storefrontCategoryCount ?? 0),
  };
}

export function BusinessHubProvider({
  children,
  initialTask = 'storefront',
}: {
  children: ReactNode;
  initialTask?: HubTaskId;
}) {
  const [profile, setProfile] = useState<BusinessHubProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTask, setActiveTask] = useState<HubTaskId>(initialTask);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!hasLoadedRef.current) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch('/api/business/me', { headers: getClientAuthHeaders() });
      if (!res.ok) return;
      const data = (await res.json()) as Record<string, unknown>;
      setProfile(mapApiToProfile(data));
      hasLoadedRef.current = true;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const patchProfile = useCallback((patch: BusinessHubProfilePatch) => {
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const completion = useMemo(() => {
    if (!profile) return null;
    return computeBusinessProfileCompletion({
      name: profile.name,
      categorySlugs: profile.categorySlugs,
      description: profile.description,
      logo: profile.logo,
      coverImage: profile.coverImage,
      phone: profile.phone,
      whatsapp: profile.whatsapp,
      website: profile.website,
      instagram: profile.instagram,
      telegram: profile.telegram,
      bale: profile.bale,
      rubika: profile.rubika,
      eitaa: profile.eitaa,
      offerCount: profile.offerCount,
      portfolioCount: profile.portfolioCount,
    });
  }, [profile]);

  const value = useMemo(
    () => ({
      profile,
      loading,
      refreshing,
      completion,
      refresh,
      patchProfile,
      activeTask,
      setActiveTask,
    }),
    [profile, loading, refreshing, completion, refresh, patchProfile, activeTask]
  );

  return (
    <BusinessHubContext.Provider value={value}>{children}</BusinessHubContext.Provider>
  );
}

export function useBusinessHub(): BusinessHubContextValue {
  const ctx = useContext(BusinessHubContext);
  if (!ctx) {
    throw new Error('useBusinessHub must be used within BusinessHubProvider');
  }
  return ctx;
}

export function useBusinessHubOptional(): BusinessHubContextValue | null {
  return useContext(BusinessHubContext);
}

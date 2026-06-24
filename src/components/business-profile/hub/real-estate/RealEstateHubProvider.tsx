'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';
import type { PropertyListing } from '@/contracts/business-profile';
import type { EcosystemExtension } from '@/lib/business/ecosystem/types';
import type { RealEstateSubtype, WidgetConfig } from '@/lib/business/widget-registry';
import { getPrimaryRealEstateSubtypeFromSlugs } from '@/lib/business/is-real-estate-business';
import {
  computeRealEstateHubCompletion,
  getIncompleteItemIdsForTask,
  type RealEstateCompletionItemId,
} from '@/lib/business/real-estate-hub-completion';
import {
  RealEstateHubContext,
  type EcosystemOwnerPatch,
  type RealEstateHubContextValue,
  type WidgetDefinitionSummary,
} from './RealEstateHubContext.types';
import type { RealEstateHubTaskId } from '@/lib/business/real-estate-hub-tasks';
import { useBusinessHub } from '../BusinessHubContext';

export function RealEstateHubProvider({ children }: { children: ReactNode }) {
  const { profile, refresh: refreshProfile } = useBusinessHub();
  const [activeTask, _setActiveTask] = useState<RealEstateHubTaskId>('overview');
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [ecosystem, setEcosystem] = useState<EcosystemExtension>({});
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig[]>([]);
  const [widgetDefinitions, setWidgetDefinitions] = useState<WidgetDefinitionSummary[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [reLoading, setReLoading] = useState(true);
  const [reRefreshing, setReRefreshing] = useState(false);
  const [highlightedItemIds, setHighlightedItemIds] = useState<RealEstateCompletionItemId[]>([]);
  const hasLoadedRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const subtype: RealEstateSubtype | null = profile
    ? getPrimaryRealEstateSubtypeFromSlugs(profile.occupationSlugs)
    : null;

  const completion = useMemo(() => {
    if (!profile || !subtype) return null;
    return computeRealEstateHubCompletion({
      subtype,
      name: profile.name,
      description: profile.description,
      logo: profile.logo,
      coverImage: profile.coverImage,
      phone: profile.phone,
      whatsapp: profile.whatsapp,
      tags,
      listings,
      portfolioCount: profile.portfolioCount,
      offerCount: profile.offerCount,
      ecosystem,
    });
  }, [profile, subtype, tags, listings, ecosystem]);

  const pulseIncompleteForTask = useCallback(
    (taskId: RealEstateHubTaskId) => {
      const ids = getIncompleteItemIdsForTask(completion, taskId);
      setHighlightedItemIds(ids);
      clearTimeout(highlightTimerRef.current);
      if (ids.length > 0) {
        highlightTimerRef.current = setTimeout(() => setHighlightedItemIds([]), 9000);
      }
    },
    [completion]
  );

  const setActiveTask = useCallback(
    (taskId: RealEstateHubTaskId) => {
      _setActiveTask(taskId);
      if (taskId === 'overview') {
        setHighlightedItemIds([]);
        return;
      }
      pulseIncompleteForTask(taskId);
    },
    [pulseIncompleteForTask]
  );

  const navigateToTask = useCallback(
    (taskId: RealEstateHubTaskId) => {
      setActiveTask(taskId);
      if (taskId !== 'overview') {
        requestAnimationFrame(() => {
          panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
    },
    [setActiveTask]
  );

  useEffect(() => {
    if (highlightedItemIds.length === 0) return;
    const timer = setTimeout(() => {
      panelRef.current
        ?.querySelector('[data-incomplete-highlight]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
    return () => clearTimeout(timer);
  }, [highlightedItemIds]);

  useEffect(() => {
    const el = panelRef.current;
    if (!el || activeTask === 'overview') return;

    let hasPulsedOnScroll = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (hasPulsedOnScroll || !entry?.isIntersecting || entry.intersectionRatio < 0.2) return;
        const ids = getIncompleteItemIdsForTask(completion, activeTask);
        if (ids.length === 0) return;
        hasPulsedOnScroll = true;
        pulseIncompleteForTask(activeTask);
      },
      { threshold: [0.2] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [activeTask, completion, pulseIncompleteForTask]);

  const refreshRealEstateData = useCallback(async () => {
    if (!profile) return;

    if (!hasLoadedRef.current) setReLoading(true);
    else setReRefreshing(true);

    try {
      const headers = getClientAuthHeaders();
      const [listingsRes, ecoRes, widgetsRes, meRes] = await Promise.all([
        fetch('/api/business/me/real-estate', { headers }),
        fetch('/api/business/me/ecosystem', { headers }),
        fetch('/api/business/me/widgets', { headers }),
        fetch('/api/business/me', { headers }),
      ]);

      if (listingsRes.ok) {
        const data = (await listingsRes.json()) as { listings?: PropertyListing[] };
        setListings(data.listings ?? []);
      }

      if (ecoRes.ok) {
        const data = (await ecoRes.json()) as { ecosystem?: EcosystemExtension };
        setEcosystem(data.ecosystem ?? {});
      }

      if (widgetsRes.ok) {
        const data = (await widgetsRes.json()) as {
          widgets?: WidgetConfig[];
          definitions?: WidgetDefinitionSummary[];
        };
        setWidgetConfig(data.widgets ?? []);
        setWidgetDefinitions(data.definitions ?? []);
      }

      if (meRes.ok) {
        const data = (await meRes.json()) as { tags?: string[] };
        setTags(data.tags ?? []);
      }

      hasLoadedRef.current = true;
    } catch {
      toast.error('خطا در بارگذاری داده‌های املاک');
    } finally {
      setReLoading(false);
      setReRefreshing(false);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) void refreshRealEstateData();
  }, [profile, refreshRealEstateData]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshProfile(), refreshRealEstateData()]);
  }, [refreshProfile, refreshRealEstateData]);

  const saveListings = useCallback(async (next: PropertyListing[]) => {
    const res = await fetch('/api/business/me/real-estate', {
      method: 'PATCH',
      headers: getClientAuthHeaders(),
      body: JSON.stringify({ listings: next }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? 'ذخیره آگهی‌ها ناموفق بود');
    }
    setListings(next);
  }, []);

  const saveEcosystem = useCallback(async (patch: EcosystemOwnerPatch) => {
    const body: Record<string, unknown> = {};
    if (patch.specializations !== undefined) body.specializations = patch.specializations;
    if (patch.serviceArea !== undefined) body.serviceArea = patch.serviceArea;
    if (patch.network !== undefined) body.network = patch.network;
    if (patch.knowledge !== undefined) body.knowledge = patch.knowledge;
    if (patch.verificationDocuments !== undefined) {
      body.verificationDocuments = patch.verificationDocuments;
    }

    const res = await fetch('/api/business/me/ecosystem', {
      method: 'PATCH',
      headers: getClientAuthHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? 'ذخیره ناموفق بود');
    }
    const data = (await res.json()) as { ecosystem?: EcosystemExtension };
    if (data.ecosystem) setEcosystem(data.ecosystem);
  }, []);

  const saveWidgetConfig = useCallback(async (next: WidgetConfig[]) => {
    const res = await fetch('/api/business/me/widgets', {
      method: 'PATCH',
      headers: getClientAuthHeaders(),
      body: JSON.stringify({ widgets: next }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? 'ذخیره ویجت‌ها ناموفق بود');
    }
    setWidgetConfig(next);
  }, []);

  const saveTags = useCallback(async (next: string[]) => {
    const res = await fetch('/api/business/me', {
      method: 'PATCH',
      headers: getClientAuthHeaders(),
      body: JSON.stringify({ tags: next }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? 'ذخیره برچسب‌ها ناموفق بود');
    }
    setTags(next);
  }, []);

  const value: RealEstateHubContextValue = {
    subtype,
    activeTask,
    setActiveTask,
    completion,
    highlightedItemIds,
    panelRef,
    navigateToTask,
    listings,
    ecosystem,
    widgetConfig,
    widgetDefinitions,
    tags,
    reLoading,
    reRefreshing,
    refreshRealEstateData,
    refreshAll,
    saveListings,
    saveEcosystem,
    saveWidgetConfig,
    saveTags,
  };

  return (
    <RealEstateHubContext.Provider value={value}>{children}</RealEstateHubContext.Provider>
  );
}

export { useRealEstateHub } from './RealEstateHubContext.types';

'use client';

import { createContext, useContext, type RefObject } from 'react';
import type { PropertyListing } from '@/contracts/business-profile';
import type { EcosystemExtension, VerificationDocument } from '@/lib/business/ecosystem/types';
import type { RealEstateSubtype, WidgetConfig } from '@/lib/business/widget-registry';
import type { RealEstateHubTaskId } from '@/lib/business/real-estate-hub-tasks';
import type {
  RealEstateCompletionItemId,
  RealEstateCompletionResult,
} from '@/lib/business/real-estate-hub-completion';

export type EcosystemOwnerPatch = Partial<
  Pick<EcosystemExtension, 'specializations' | 'serviceArea' | 'network' | 'knowledge'>
> & {
  verificationDocuments?: VerificationDocument[];
};

export type WidgetDefinitionSummary = {
  id: string;
  title: string;
  description?: string;
  defaultEnabled: boolean;
};

export type RealEstateHubContextValue = {
  subtype: RealEstateSubtype | null;
  activeTask: RealEstateHubTaskId;
  setActiveTask: (task: RealEstateHubTaskId) => void;
  completion: RealEstateCompletionResult | null;
  highlightedItemIds: RealEstateCompletionItemId[];
  panelRef: RefObject<HTMLDivElement | null>;
  navigateToTask: (taskId: RealEstateHubTaskId) => void;
  listings: PropertyListing[];
  ecosystem: EcosystemExtension;
  widgetConfig: WidgetConfig[];
  widgetDefinitions: WidgetDefinitionSummary[];
  tags: string[];
  reLoading: boolean;
  reRefreshing: boolean;
  refreshRealEstateData: () => Promise<void>;
  refreshAll: () => Promise<void>;
  saveListings: (listings: PropertyListing[]) => Promise<void>;
  saveEcosystem: (patch: EcosystemOwnerPatch) => Promise<void>;
  saveWidgetConfig: (config: WidgetConfig[]) => Promise<void>;
  saveTags: (tags: string[]) => Promise<void>;
};

export const RealEstateHubContext = createContext<RealEstateHubContextValue | null>(null);

export function useRealEstateHub(): RealEstateHubContextValue {
  const ctx = useContext(RealEstateHubContext);
  if (!ctx) {
    throw new Error('useRealEstateHub must be used within RealEstateHubProvider');
  }
  return ctx;
}

export function useRealEstateHubOptional(): RealEstateHubContextValue | null {
  return useContext(RealEstateHubContext);
}

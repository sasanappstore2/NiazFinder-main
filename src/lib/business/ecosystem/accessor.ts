import type { Business } from '@/contracts/business-profile';
import type {
  EcosystemExtension,
  KnowledgeHubState,
  NetworkGraphState,
  ServiceAreaState,
  SpecializationTag,
  VerificationState,
} from './types';

/**
 * Single source of truth for reading/writing the ecosystem blob stored under
 * `business.extensions.ecosystem`. All getters are null-safe and return sane
 * defaults so widgets never crash on partial data.
 */

export function getEcosystemExtension(
  business: Business | null | undefined
): EcosystemExtension {
  const ext = (business?.extensions as { ecosystem?: EcosystemExtension } | undefined)?.ecosystem;
  return ext ?? {};
}

export function getSpecializations(business: Business | null | undefined): SpecializationTag[] {
  return getEcosystemExtension(business).specializations ?? [];
}

export function getVerificationState(business: Business | null | undefined): VerificationState {
  return (
    getEcosystemExtension(business).verification ?? {
      level: 'basic',
      documents: [],
    }
  );
}

export function getServiceAreaState(business: Business | null | undefined): ServiceAreaState {
  return getEcosystemExtension(business).serviceArea ?? { areas: [] };
}

export function getNetworkState(business: Business | null | undefined): NetworkGraphState {
  return (
    getEcosystemExtension(business).network ?? { connections: [], referralsSent: [] }
  );
}

export function getKnowledgeState(business: Business | null | undefined): KnowledgeHubState {
  return getEcosystemExtension(business).knowledge ?? { articles: [] };
}

/** Merge an ecosystem patch into a raw extensions object (server-side persistence). */
export function mergeEcosystemIntoExtensions(
  rawExtensions: string | Record<string, unknown> | null | undefined,
  patch: Partial<EcosystemExtension>
): Record<string, unknown> {
  let base: Record<string, unknown> = {};
  if (typeof rawExtensions === 'string') {
    try {
      base = JSON.parse(rawExtensions || '{}');
    } catch {
      base = {};
    }
  } else if (rawExtensions && typeof rawExtensions === 'object') {
    base = { ...rawExtensions };
  }
  const ecosystem = (base.ecosystem as EcosystemExtension | undefined) ?? {};
  return { ...base, ecosystem: { ...ecosystem, ...patch } };
}

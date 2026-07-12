/**
 * Builds the `EngineVersionManifest` for whatever code is running right now — CCQS §1.2/§11
 * (`PLAN/ccqs-architecture.md`). Pure, reads only version constants already defined at their
 * respective sources; never invents a version number here.
 */
import { ENGINE_VERSION as COGNITIVE_ENGINE_VERSION } from '@/cognitive-engine/canonical-need/build-canonical-need';
import { RULES_REGISTRY_VERSION } from '@/intake/rules/registry-version';
import {
  LOCATION_CATALOG_NAMESPACE,
  locationCatalogSourceLabel,
} from '@/intake/intelligence-engine/indexes/location-catalog-version';
import {
  SEE_COMPARATOR_ENGINE_VERSION,
  SEE_ONTOLOGY_PROVIDERS,
} from '@/semantic-evaluation-engine/config';
import type { EngineVersionManifest } from '../types';

export interface CurrentEngineVersionOptions {
  label: string;
  gitCommit?: string | null;
  now: string;
}

export function currentEngineVersionManifest(opts: CurrentEngineVersionOptions): EngineVersionManifest {
  const ontologyVersions: Record<string, string> = {};
  for (const [namespace, provider] of Object.entries(SEE_ONTOLOGY_PROVIDERS)) {
    ontologyVersions[namespace] = provider.version;
  }
  // Location catalog axis (Replay Determinism Audit §3 gap; RFC-004 §30 requirement) — carried
  // through the existing namespace→version map, so the frozen manifest schema is untouched.
  // Includes the live SOURCE (+db vs +json-fallback): the audit's finding was that DB
  // unavailability silently swaps the candidate universe, so source is part of catalog identity.
  ontologyVersions[LOCATION_CATALOG_NAMESPACE] = locationCatalogSourceLabel();

  return {
    label: opts.label,
    cognitiveEngineVersion: COGNITIVE_ENGINE_VERSION,
    semanticContractVersion: '1.0.0', // SEE's SemanticSnapshot contract version (see semantic-evaluation-engine/adapters)
    comparatorEngineVersion: SEE_COMPARATOR_ENGINE_VERSION,
    ontologyVersions,
    rulesRegistryVersion: RULES_REGISTRY_VERSION,
    gitCommit: opts.gitCommit ?? null,
    createdAt: opts.now,
  };
}

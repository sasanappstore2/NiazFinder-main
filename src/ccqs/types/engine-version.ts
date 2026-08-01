/**
 * EngineVersionManifest — CCQS §1.2 (`PLAN/ccqs-architecture.md`). Extends SEE's own versioning
 * axes (`PLAN/semantic-comparator-architecture.md` §6) with the one axis SEE doesn't track: the
 * category rules registry (`RULES_REGISTRY_VERSION`).
 */
import { z } from 'zod';

export const engineVersionManifestSchema = z.object({
  label: z.string().min(1),
  cognitiveEngineVersion: z.string().min(1),
  semanticContractVersion: z.string().min(1),
  comparatorEngineVersion: z.string().min(1),
  ontologyVersions: z.record(z.string(), z.string()),
  rulesRegistryVersion: z.string().min(1),
  gitCommit: z.string().nullable(),
  createdAt: z.string(),
});
export type EngineVersionManifest = z.infer<typeof engineVersionManifestSchema>;

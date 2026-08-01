/** Declarative capability flags — used for provider selection without instanceof checks. */
export type ProviderCapabilities = {
  authentication: boolean;
  javascript: boolean;
  streaming: boolean;
  screenshots: boolean;
  structuredExtraction: boolean;
  pagination: boolean;
  incremental: boolean;
  rateLimiting: boolean;
  sitemapDiscovery: boolean;
  linkDiscovery: boolean;
  markdown: boolean;
  rawHtml: boolean;
};

export const CAPABILITY_NONE: ProviderCapabilities = {
  authentication: false,
  javascript: false,
  streaming: false,
  screenshots: false,
  structuredExtraction: false,
  pagination: false,
  incremental: false,
  rateLimiting: false,
  sitemapDiscovery: false,
  linkDiscovery: false,
  markdown: false,
  rawHtml: true,
};

export function mergeCapabilities(
  base: ProviderCapabilities,
  patch: Partial<ProviderCapabilities>
): ProviderCapabilities {
  return { ...base, ...patch };
}

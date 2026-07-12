/** Summarize auto-onboard API response for wizard telemetry display. */

export type OnboardTelemetry = {
  ok: boolean;
  listingsUrl?: string;
  score?: number;
  pagesChecked?: number;
  steps: string[];
  portalFamily?: string;
  containerSelector?: string;
  fieldCount: number;
};

export function parseOnboardTelemetry(raw: Record<string, unknown>): OnboardTelemetry {
  const report = (raw.report as { steps?: string[] }) ?? {};
  const telemetry = Array.isArray(raw.telemetry) ? raw.telemetry : [];
  const stepEvents = telemetry
    .map((t) => {
      const row = t as { event?: string; listingsUrl?: string; count?: number };
      if (row.event === 'discover' && row.listingsUrl) return `discover:${row.listingsUrl}`;
      if (row.event === 'preview' && row.count != null) return `preview:${row.count}`;
      return row.event ? String(row.event) : '';
    })
    .filter(Boolean);
  const blueprint = (raw.blueprint as { listPage?: { containerSelector?: string }; fieldMap?: Record<string, unknown> }) ?? {};
  const siteIndex = (raw.siteIndex as { portalFamily?: string }) ?? {};
  return {
    ok: Boolean(raw.ok),
    listingsUrl: typeof raw.listingsUrl === 'string' ? raw.listingsUrl : undefined,
    score: typeof raw.score === 'number' ? raw.score : undefined,
    pagesChecked: typeof raw.pagesChecked === 'number' ? raw.pagesChecked : undefined,
    steps: stepEvents.length ? stepEvents : Array.isArray(report.steps) ? report.steps.map(String) : [],
    portalFamily: siteIndex.portalFamily,
    containerSelector: blueprint.listPage?.containerSelector,
    fieldCount: Object.keys(blueprint.fieldMap ?? {}).length,
  };
}

export function formatOnboardTelemetry(t: OnboardTelemetry): string {
  const parts: string[] = [];
  parts.push(t.ok ? 'موفق' : 'جزئی');
  if (t.portalFamily) parts.push(`خانواده: ${t.portalFamily}`);
  if (t.containerSelector) parts.push(`container OK`);
  parts.push(`${t.fieldCount} فیلد`);
  if (t.score != null) parts.push(`امتیاز ${Math.round(t.score)}`);
  if (t.pagesChecked != null) parts.push(`${t.pagesChecked} صفحه`);
  if (t.steps.length) parts.push(t.steps.join(' → '));
  return parts.join(' · ');
}

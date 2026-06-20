export type ConnectionProfile = 'slow' | 'fast';

type NavigatorConnection = {
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
};

function readNavigatorConnection(): NavigatorConnection | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { connection?: NavigatorConnection }).connection;
}

/** Classify network for adaptive loading (maps, socket, prefetch, images). */
export function getConnectionProfile(): ConnectionProfile {
  if (typeof window === 'undefined') return 'fast';

  const connection = readNavigatorConnection();
  if (connection?.saveData) return 'slow';

  const effectiveType = connection?.effectiveType?.toLowerCase();
  if (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g') {
    return 'slow';
  }

  if (typeof connection?.downlink === 'number' && connection.downlink < 1.5) {
    return 'slow';
  }

  return 'fast';
}

export function shouldDeferHeavyFeatures(): boolean {
  return getConnectionProfile() === 'slow';
}

export function shouldEnablePrefetch(): boolean {
  return getConnectionProfile() === 'fast';
}

export function preferredImageQuality(): 'low' | 'high' {
  return shouldDeferHeavyFeatures() ? 'low' : 'high';
}

export function defaultBrowseViewMode(): 'list' | 'map-pending' {
  return shouldDeferHeavyFeatures() ? 'list' : 'list';
}

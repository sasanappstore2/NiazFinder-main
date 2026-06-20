/** Browse maps ? cluster until this zoom; individual pins above it. */
export const BROWSE_CLUSTER_MAX_ZOOM = 14;

/** Supercluster / MapLibre cluster radius in pixels. */
export const BROWSE_CLUSTER_RADIUS = 56;

/** Cluster circle colors [small, medium, large] ? matches --bm-cluster / primary. */
export const BROWSE_CLUSTER_COLORS: [string, string, string] = [
  '#34d399',
  '#059669',
  '#047857',
];

/** Point-count thresholds for cluster size/color steps. */
export const BROWSE_CLUSTER_THRESHOLDS: [number, number] = [10, 40];

import { Clock, Flame } from 'lucide-react';
import type { ServiceRequest } from '@/lib/types';

const ADDRESS_PART_SEP = /[،,؟?\-\|–—·]+/u;

function parseDynamicAnswers(
  raw?: string | Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function neighborhoodFromDynamicAnswers(
  dynamicAnswers?: string | Record<string, unknown> | null
): string | null {
  const parsed = parseDynamicAnswers(dynamicAnswers);
  if (!parsed) return null;
  const direct = parsed.neighborhood ?? parsed._neighborhood;
  return typeof direct === 'string' && direct.trim() ? direct.trim() : null;
}

function splitAddressParts(address: string): string[] {
  return address
    .trim()
    .split(ADDRESS_PART_SEP)
    .map((part) => part.replace(/^محله\s+/u, '').trim())
    .filter(Boolean);
}

/** Neighborhood label for cards/detail (prefers dynamicAnswers, then last address segment). */
export function extractNeighborhoodLabel(
  address?: string,
  dynamicAnswers?: string | Record<string, unknown> | null
): string | null {
  const fromDynamic = neighborhoodFromDynamicAnswers(dynamicAnswers);
  if (fromDynamic) return fromDynamic;

  if (!address?.trim()) return null;
  const parts = splitAddressParts(address);
  if (!parts.length) return null;
  if (parts.length === 1) return parts[0]!;
  return parts[parts.length - 1]!;
}

/** Single-line location for browse cards (province · city · neighborhood). */
export function formatNeedLocationLabel(
  request: Pick<ServiceRequest, 'province' | 'city' | 'address' | 'dynamicAnswers'>
): string | null {
  const province = request.province?.trim();
  const city = request.city?.trim();
  const neighborhood = extractNeighborhoodLabel(request.address, request.dynamicAnswers);
  const parts: string[] = [];
  if (province) parts.push(province);
  if (city && city !== province) parts.push(city);
  if (neighborhood && neighborhood !== city && neighborhood !== province) parts.push(neighborhood);
  return parts.length ? parts.join(' · ') : null;
}

export function getPriorityConfig(priority: string) {
  const configs: Record<string, { className: string; icon: typeof Flame }> = {
    URGENT: { className: 'bg-destructive/10 text-destructive border-destructive/20', icon: Flame },
    HIGH: {
      className:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
      icon: Flame,
    },
    NORMAL: { className: 'bg-muted text-muted-foreground border-border', icon: Clock },
    LOW: { className: 'bg-muted text-muted-foreground border-border', icon: Clock },
  };
  return configs[priority] || configs.NORMAL;
}

export function registrantInitials(user: ServiceRequest['user']): string {
  const f = user.firstName?.trim();
  const l = user.lastName?.trim();
  if (f?.[0] && l?.[0]) return `${f[0]}${l[0]}`;
  const full = `${f ?? ''} ${l ?? ''}`.trim();
  if (full.length >= 2) return full.slice(0, 2);
  if (full.length === 1) return full;
  return '؟';
}

export function getStatusConfig(status: string) {
  const configs: Record<string, string> = {
    OPEN: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400',
    IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400',
    CLOSED: 'bg-gray-50 text-gray-600 border-gray-200',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-red-50 text-red-600 border-red-200',
  };
  return configs[status] || 'bg-muted text-muted-foreground border-border';
}

export const NEED_OWNER_PROPOSALS_ANCHOR = 'need-owner-proposals';

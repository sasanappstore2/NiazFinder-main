import { Clock, Flame } from 'lucide-react';
import type { ServiceRequest } from '@/lib/types';

export function extractNeighborhoodLabel(address?: string): string | null {
  if (!address) return null;
  const cleaned = address.trim();
  if (!cleaned) return null;
  const head = cleaned.split(/[،,\-|–—]/)[0]?.trim();
  if (!head) return null;
  return head;
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

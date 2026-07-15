'use client';

import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { WorkspaceFollowUpItem } from '../types';

function fireReminderToast(item: WorkspaceFollowUpItem) {
  const reminder = item.reminder;
  if (!reminder) return;

  toast.info(`یادآور پیگیری`, {
    description: `${reminder.label} — ${item.subject}`,
    duration: 12_000,
  });

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('یادآور پیگیری', {
        body: `${reminder.label} — ${item.subject}`,
        tag: `followup-${item.id}`,
      });
    } catch {
      // ignore unsupported environments
    }
  }
}

export function useFollowUpReminderScheduler(
  followUps: WorkspaceFollowUpItem[],
  onReminderFired: (followUpId: string, reminderId: string) => void
) {
  const firedRef = useRef<Set<string>>(new Set());
  const onFiredRef = useRef(onReminderFired);

  useEffect(() => {
    onFiredRef.current = onReminderFired;
  }, [onReminderFired]);

  const processDue = useCallback((items: WorkspaceFollowUpItem[]) => {
    const now = Date.now();
    for (const item of items) {
      const reminder = item.reminder;
      if (!reminder || reminder.firedAt) continue;

      const due = new Date(reminder.dueAt).getTime();
      if (Number.isNaN(due)) continue;

      const fireKey = `${item.id}:${reminder.id}`;
      if (due <= now && !firedRef.current.has(fireKey)) {
        firedRef.current.add(fireKey);
        fireReminderToast(item);
        onFiredRef.current(item.id, reminder.id);
      }
    }
  }, []);

  useEffect(() => {
    processDue(followUps);

    const timers: ReturnType<typeof setTimeout>[] = [];
    const now = Date.now();

    for (const item of followUps) {
      const reminder = item.reminder;
      if (!reminder || reminder.firedAt) continue;

      const due = new Date(reminder.dueAt).getTime();
      if (Number.isNaN(due)) continue;

      const delay = due - now;
      if (delay <= 0) continue;

      const fireKey = `${item.id}:${reminder.id}`;
      timers.push(
        setTimeout(() => {
          if (firedRef.current.has(fireKey)) return;
          firedRef.current.add(fireKey);
          fireReminderToast(item);
          onFiredRef.current(item.id, reminder.id);
        }, delay)
      );
    }

    const interval = setInterval(() => processDue(followUps), 30_000);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [followUps, processDue]);
}

export async function requestFollowUpNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';
import {
  computeReminderDueAt,
  type FollowUpQuickReminderPreset,
} from '@/lib/business/workspace/follow-up-stage-actions';
import {
  followUpCustomerLabel,
  followUpContactMeta,
  followUpLinkHref,
  followUpPropertyLabel,
  followUpSourceId,
  followUpSubjectLabel,
  type WorkspaceFollowUpCandidate,
} from '@/lib/business/workspace/follow-up-source';
import {
  FOLLOW_UP_STAGES,
  type FollowUpStageNote,
  type FollowUpReminder,
  type WorkspaceFollowUpItem,
  type WorkspaceNeedItem,
} from '../types';
import type { WorkspaceCollaborationItem } from '../types';

const STORAGE_PREFIX = 'workspace-followups';

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function normalizeFollowUp(item: WorkspaceFollowUpItem): WorkspaceFollowUpItem {
  const stageNotes =
    item.stageNotes && item.stageNotes.length > 0
      ? item.stageNotes
      : item.note?.trim()
        ? [
            {
              id: `note-init-${item.id}`,
              stage: item.stage,
              text: item.note.trim(),
              createdAt: item.createdAt,
            },
          ]
        : [];

  return {
    ...item,
    stageNotes,
    reminder: item.reminder ?? null,
    nextActionDate: item.reminder?.dueAt ?? item.nextActionDate ?? null,
    contactRequestId:
      item.contactRequestId ??
      (item.sourceKind !== 'collaboration' && !item.requestId.startsWith('collab:')
        ? item.requestId
        : null),
  };
}

function loadFollowUps(userId: string): WorkspaceFollowUpItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WorkspaceFollowUpItem[];
    return Array.isArray(parsed) ? parsed.map(normalizeFollowUp) : [];
  } catch {
    return [];
  }
}

function saveFollowUps(userId: string, items: WorkspaceFollowUpItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

function buildFollowUpItem(
  source: WorkspaceFollowUpCandidate,
  note: string
): WorkspaceFollowUpItem {
  const stageLabel = FOLLOW_UP_STAGES.find((s) => s.id === 'new')?.label ?? 'جدید';
  const sourceId = followUpSourceId(source);
  const trimmed = note.trim();
  const createdAt = new Date().toISOString();
  const contact = followUpContactMeta(source);

  return normalizeFollowUp({
    kind: 'followup',
    id: `followup-${sourceId}-${Date.now()}`,
    stage: 'new',
    subject: followUpSubjectLabel(source),
    note: trimmed,
    customer: followUpCustomerLabel(source),
    property: followUpPropertyLabel(source),
    requestId: sourceId,
    needUrl: followUpLinkHref(source),
    sourceKind: source.kind === 'need' ? 'need' : 'collaboration',
    nextActionDate: null,
    owner: null,
    status: stageLabel,
    createdAt,
    stageNotes: trimmed
      ? [{ id: `note-${Date.now()}`, stage: 'new', text: trimmed, createdAt }]
      : [],
    reminder: null,
    contactUserId: contact.contactUserId,
    chatUrl: contact.chatUrl,
    contactRequestId: contact.contactRequestId,
    authorSlug: contact.authorSlug,
    hasPhone: contact.hasPhone,
    chatEnabled: contact.chatEnabled,
  });
}

export function useWorkspaceFollowUps(userId: string | undefined) {
  const [followUps, setFollowUps] = useState<WorkspaceFollowUpItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!userId) {
      setFollowUps([]);
      setHydrated(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      const local = loadFollowUps(userId);
      try {
        const res = await fetch('/api/business/me/workspace-follow-ups', {
          headers: getClientAuthHeaders(),
        });
        if (res.ok) {
          const body = (await res.json()) as { followUps?: WorkspaceFollowUpItem[] };
          const server = Array.isArray(body.followUps)
            ? body.followUps.map(normalizeFollowUp)
            : [];

          if (cancelled) return;

          if (server.length > 0) {
            setFollowUps(server);
            saveFollowUps(userId, server);
          } else if (local.length > 0) {
            setFollowUps(local);
            await fetch('/api/business/me/workspace-follow-ups', {
              method: 'PATCH',
              headers: {
                ...getClientAuthHeaders(),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ followUps: local }),
            }).catch(() => undefined);
          } else {
            setFollowUps([]);
          }
          return;
        }
      } catch {
        // fall through to local
      }

      if (!cancelled) setFollowUps(local);
    })().finally(() => {
      if (!cancelled) setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !hydrated) return;
    saveFollowUps(userId, followUps);

    const timer = setTimeout(() => {
      void fetch('/api/business/me/workspace-follow-ups', {
        method: 'PATCH',
        headers: {
          ...getClientAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ followUps }),
      }).catch(() => undefined);
    }, 800);

    return () => clearTimeout(timer);
  }, [userId, followUps, hydrated]);

  const addFromSource = useCallback((source: WorkspaceFollowUpCandidate, note: string) => {
    const trimmed = note.trim();
    if (!trimmed) return;
    setFollowUps((prev) => [buildFollowUpItem(source, trimmed), ...prev]);
  }, []);

  const addFromNeed = useCallback(
    (need: WorkspaceNeedItem, note: string) => addFromSource(need, note),
    [addFromSource]
  );

  const addFromCollaboration = useCallback(
    (collaboration: WorkspaceCollaborationItem, note: string) =>
      addFromSource(collaboration, note),
    [addFromSource]
  );

  const isSourceTracked = useCallback(
    (source: WorkspaceFollowUpCandidate) =>
      followUps.some((f) => f.requestId === followUpSourceId(source)),
    [followUps]
  );

  const isNeedTracked = useCallback(
    (requestId: string) => followUps.some((f) => f.requestId === requestId),
    [followUps]
  );

  const updateStage = useCallback((followUpId: string, stage: WorkspaceFollowUpItem['stage']) => {
    const label = FOLLOW_UP_STAGES.find((s) => s.id === stage)?.label ?? stage;
    setFollowUps((prev) =>
      prev.map((item) =>
        item.id === followUpId
          ? {
              ...item,
              stage,
              status: label,
              reminder:
                item.reminder && !item.reminder.firedAt && item.reminder.stage !== stage
                  ? null
                  : item.reminder,
              nextActionDate:
                item.reminder && !item.reminder.firedAt && item.reminder.stage !== stage
                  ? null
                  : item.nextActionDate,
            }
          : item
      )
    );
  }, []);

  const appendStageNote = useCallback((followUpId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const entry: FollowUpStageNote = {
      id: `note-${Date.now()}`,
      stage: 'new',
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    setFollowUps((prev) =>
      prev.map((item) => {
        if (item.id !== followUpId) return item;
        const note: FollowUpStageNote = { ...entry, stage: item.stage };
        const stageNotes = [...(item.stageNotes ?? []), note];
        return { ...item, stageNotes, note: trimmed };
      })
    );
  }, []);

  const setQuickReminder = useCallback(
    (followUpId: string, preset: FollowUpQuickReminderPreset) => {
      const dueAt = computeReminderDueAt(preset.offset);
      const reminder: FollowUpReminder = {
        id: `reminder-${Date.now()}`,
        stage: 'new',
        label: preset.label,
        dueAt: dueAt.toISOString(),
        firedAt: null,
      };

      setFollowUps((prev) =>
        prev.map((item) => {
          if (item.id !== followUpId) return item;
          const nextReminder = { ...reminder, stage: item.stage };
          return {
            ...item,
            reminder: nextReminder,
            nextActionDate: nextReminder.dueAt,
          };
        })
      );
    },
    []
  );

  const clearReminder = useCallback((followUpId: string) => {
    setFollowUps((prev) =>
      prev.map((item) =>
        item.id === followUpId ? { ...item, reminder: null, nextActionDate: null } : item
      )
    );
  }, []);

  const markReminderFired = useCallback((followUpId: string, reminderId: string) => {
    setFollowUps((prev) =>
      prev.map((item) => {
        if (item.id !== followUpId || item.reminder?.id !== reminderId) return item;
        return {
          ...item,
          reminder: { ...item.reminder, firedAt: new Date().toISOString() },
        };
      })
    );
  }, []);

  const removeFollowUp = useCallback((followUpId: string) => {
    setFollowUps((prev) => prev.filter((item) => item.id !== followUpId));
  }, []);

  return {
    followUps,
    addFromSource,
    addFromNeed,
    addFromCollaboration,
    isSourceTracked,
    isNeedTracked,
    updateStage,
    appendStageNote,
    setQuickReminder,
    clearReminder,
    markReminderFired,
    removeFollowUp,
    hydrated,
  };
}

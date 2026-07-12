'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { IntakeAgentFieldProjection, IntakeAgentResult } from '@/intake/agent/types';

export type ProposalFieldStatus = 'pending' | 'confirmed' | 'rejected' | 'edited';

export interface ProposalFieldRecord {
  key: string;
  status: ProposalFieldStatus;
  proposedValue: unknown;
  displayValue: string;
  label: string;
  confidence: number;
  /** Value after confirm or edit. */
  committedValue?: unknown;
  sourceTextSignature: string;
}

export interface UseIntakeProposalConfirmation {
  textSignature: string | null;
  records: Record<string, ProposalFieldRecord>;
  pendingCount: number;
  confirmedCount: number;
  /** Sync proposals from a fresh agent result for the current text signature. */
  syncFromAgent: (agent: IntakeAgentResult | null, textSignature: string) => void;
  confirmField: (field: IntakeAgentFieldProjection) => ProposalFieldRecord | null;
  rejectField: (fieldKey: string) => ProposalFieldRecord | null;
  editField: (fieldKey: string, value: unknown, displayValue?: string) => ProposalFieldRecord | null;
  isPending: (fieldKey: string) => boolean;
  isConfirmed: (fieldKey: string) => boolean;
  getCommittedValue: (fieldKey: string) => unknown | undefined;
  /** Critical pending keys that block advancing past compose. */
  blockingPendingKeys: (criticalKeys: string[]) => string[];
  reset: () => void;
}

function signatureOfField(f: IntakeAgentFieldProjection): string {
  return `${f.key}:${JSON.stringify(f.value)}:${f.displayValue}`;
}

/**
 * Proposal-first confirmation state.
 * Extracted values stay pending until explicit confirm / reject / edit.
 * Confirmed values survive re-analysis for the same text signature.
 */
export function useIntakeProposalConfirmation(): UseIntakeProposalConfirmation {
  const [textSignature, setTextSignature] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, ProposalFieldRecord>>({});
  const recordsRef = useRef(records);
  recordsRef.current = records;

  const reset = useCallback(() => {
    setTextSignature(null);
    setRecords({});
  }, []);

  const syncFromAgent = useCallback((agent: IntakeAgentResult | null, sig: string) => {
    if (!agent || !sig.trim()) {
      setTextSignature(sig || null);
      return;
    }

    setTextSignature(sig);
    setRecords((prev) => {
      const next: Record<string, ProposalFieldRecord> = {};
      const prevSameText = Object.fromEntries(
        Object.entries(prev).filter(([, r]) => r.sourceTextSignature === sig)
      );

      for (const field of agent.fields) {
        const existing = prevSameText[field.key];
        if (
          existing &&
          (existing.status === 'confirmed' ||
            existing.status === 'edited' ||
            existing.status === 'rejected')
        ) {
          // Keep user decision; do not overwrite with new proposal value.
          next[field.key] = existing;
          continue;
        }
        next[field.key] = {
          key: field.key,
          status: 'pending',
          proposedValue: field.value,
          displayValue: field.displayValue,
          label: field.label,
          confidence: field.confidence,
          sourceTextSignature: sig,
        };
      }

      // Preserve confirmed/edited keys that agent no longer projects (still locked).
      for (const [key, rec] of Object.entries(prevSameText)) {
        if (next[key]) continue;
        if (rec.status === 'confirmed' || rec.status === 'edited') {
          next[key] = rec;
        }
      }

      // Avoid churn when content is identical
      const prevKeys = Object.keys(prevSameText).sort().join(',');
      const nextKeys = Object.keys(next).sort().join(',');
      if (
        prevKeys === nextKeys &&
        nextKeys
          .split(',')
          .filter(Boolean)
          .every((k) => {
            const a = prevSameText[k];
            const b = next[k];
            return (
              a &&
              b &&
              a.status === b.status &&
              signatureOfField({
                key: a.key,
                label: a.label,
                value: a.proposedValue,
                displayValue: a.displayValue,
                confidence: a.confidence,
                source: 'rule',
                action: 'confirm',
              }) ===
                signatureOfField({
                  key: b.key,
                  label: b.label,
                  value: b.proposedValue,
                  displayValue: b.displayValue,
                  confidence: b.confidence,
                  source: 'rule',
                  action: 'confirm',
                })
            );
          })
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const confirmField = useCallback((field: IntakeAgentFieldProjection) => {
    const sig = textSignature ?? '';
    const rec: ProposalFieldRecord = {
      key: field.key,
      status: 'confirmed',
      proposedValue: field.value,
      displayValue: field.displayValue,
      label: field.label,
      confidence: field.confidence,
      committedValue: field.value,
      sourceTextSignature: sig,
    };
    setRecords((prev) => ({ ...prev, [field.key]: rec }));
    return rec;
  }, [textSignature]);

  const rejectField = useCallback((fieldKey: string) => {
    const existing = recordsRef.current[fieldKey];
    if (!existing) return null;
    const rec: ProposalFieldRecord = {
      ...existing,
      status: 'rejected',
      committedValue: undefined,
    };
    setRecords((prev) => ({ ...prev, [fieldKey]: rec }));
    return rec;
  }, []);

  const editField = useCallback(
    (fieldKey: string, value: unknown, displayValue?: string) => {
      const existing = recordsRef.current[fieldKey];
      const sig = textSignature ?? existing?.sourceTextSignature ?? '';
      const rec: ProposalFieldRecord = {
        key: fieldKey,
        status: 'edited',
        proposedValue: existing?.proposedValue ?? value,
        displayValue: displayValue ?? String(value ?? ''),
        label: existing?.label ?? fieldKey,
        confidence: existing?.confidence ?? 1,
        committedValue: value,
        sourceTextSignature: sig,
      };
      setRecords((prev) => ({ ...prev, [fieldKey]: rec }));
      return rec;
    },
    [textSignature]
  );

  const isPending = useCallback(
    (fieldKey: string) => records[fieldKey]?.status === 'pending',
    [records]
  );

  const isConfirmed = useCallback(
    (fieldKey: string) => {
      const s = records[fieldKey]?.status;
      return s === 'confirmed' || s === 'edited';
    },
    [records]
  );

  const getCommittedValue = useCallback(
    (fieldKey: string) => {
      const rec = records[fieldKey];
      if (!rec || (rec.status !== 'confirmed' && rec.status !== 'edited')) return undefined;
      return rec.committedValue;
    },
    [records]
  );

  const blockingPendingKeys = useCallback(
    (criticalKeys: string[]) =>
      criticalKeys.filter((k) => {
        const rec = records[k];
        return !rec || rec.status === 'pending';
      }),
    [records]
  );

  const pendingCount = useMemo(
    () => Object.values(records).filter((r) => r.status === 'pending').length,
    [records]
  );
  const confirmedCount = useMemo(
    () =>
      Object.values(records).filter((r) => r.status === 'confirmed' || r.status === 'edited')
        .length,
    [records]
  );

  return {
    textSignature,
    records,
    pendingCount,
    confirmedCount,
    syncFromAgent,
    confirmField,
    rejectField,
    editField,
    isPending,
    isConfirmed,
    getCommittedValue,
    blockingPendingKeys,
    reset,
  };
}

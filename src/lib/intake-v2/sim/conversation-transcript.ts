import type { FieldOption, NeedDraft } from '@/contracts/need-intake';
import type { AuditFinding } from '@/lib/intake-v2/sim/conversation-auditor';

export interface ConversationTurnRecord {
  turn: number;
  userMessage: string;
  assistantMessage: string;
  activeFieldKey: string | null;
  activeFieldLabel: string | null;
  suggestedChips: FieldOption[];
  readyToPreview: boolean;
  confirmedFields: string[];
  confirmedCount: number;
  categorySlug: string;
  dealType?: string;
  findings: AuditFinding[];
  userSimSource?: 'llm' | 'template' | 'chip';
}

export interface ConversationRecord {
  id: string;
  batch: number;
  personaId: string;
  expectedCategorySlug: string;
  expectedCity: string;
  expectedDealType: string;
  turns: ConversationTurnRecord[];
  completed: boolean;
  readyToPreview: boolean;
  publishValid: boolean;
  turnCount: number;
  findings: AuditFinding[];
  startedAt: string;
  finishedAt?: string;
}

export function serializeTranscriptLine(record: ConversationTurnRecord & { convId: string }): string {
  return JSON.stringify(record);
}

export function summarizeConversation(conv: ConversationRecord): {
  id: string;
  personaId: string;
  turnCount: number;
  completed: boolean;
  readyToPreview: boolean;
  publishValid: boolean;
  failureCount: number;
  ruleIds: string[];
} {
  const ruleIds = [...new Set(conv.findings.map((f) => f.ruleId))];
  return {
    id: conv.id,
    personaId: conv.personaId,
    turnCount: conv.turnCount,
    completed: conv.completed,
    readyToPreview: conv.readyToPreview,
    publishValid: conv.publishValid,
    failureCount: conv.findings.filter((f) => f.severity === 'error').length,
    ruleIds,
  };
}

export type GoldenConversation = {
  id: string;
  personaId: string;
  userMessages: string[];
  chipTurns?: Array<{ turn: number; chipFieldKey: string; chipValue: string }>;
  expectedCategorySlug: string;
  expectedCity: string;
  expectedDealType: string;
};

export function toGoldenConversation(conv: ConversationRecord): GoldenConversation | null {
  if (!conv.publishValid || !conv.readyToPreview) return null;
  const userMessages = conv.turns.map((t) => t.userMessage);
  const chipTurns = conv.turns
    .map((t, i) => ({ turn: i, record: t }))
    .filter(({ record }) => record.userSimSource === 'chip')
    .map(({ turn, record }) => ({
      turn,
      chipFieldKey: record.activeFieldKey ?? '',
      chipValue: record.userMessage,
    }))
    .filter((c) => c.chipFieldKey);
  return {
    id: conv.id,
    personaId: conv.personaId,
    userMessages,
    chipTurns: chipTurns.length ? chipTurns : undefined,
    expectedCategorySlug: conv.expectedCategorySlug,
    expectedCity: conv.expectedCity,
    expectedDealType: conv.expectedDealType,
  };
}

import type { Message } from '@/lib/types';

export function messageSortKey(m: Message): number {
  return new Date(m.createdAt).getTime();
}

/** Turn id for optimistic user / agent-stream / persisted assistant reply. */
export function agentTurnClientId(m: Message): string | null {
  if (m.clientTempId?.startsWith('agent-reply:')) {
    return m.clientTempId.slice('agent-reply:'.length);
  }
  if (m.id.startsWith('agent-stream-')) {
    return m.id.slice('agent-stream-'.length);
  }
  if (m.clientTempId && !m.clientTempId.startsWith('agent-reply:')) {
    return m.clientTempId;
  }
  return null;
}

function agentTurnRank(m: Message, turnId: string): number | null {
  if (m.clientTempId === turnId) return 0;
  if (m.id === `agent-stream-${turnId}`) return 1;
  if (m.clientTempId === `agent-reply:${turnId}`) return 2;
  return null;
}

/** Keep user → streaming bubble → final assistant in order even if timestamps drift. */
export function compareMessages(a: Message, b: Message): number {
  const aTurn = agentTurnClientId(a);
  const bTurn = agentTurnClientId(b);
  if (aTurn && bTurn && aTurn === bTurn) {
    const ar = agentTurnRank(a, aTurn);
    const br = agentTurnRank(b, aTurn);
    if (ar != null && br != null && ar !== br) return ar - br;
  }

  const dt = messageSortKey(a) - messageSortKey(b);
  if (dt !== 0) return dt;

  const aStream = a.id.startsWith('agent-stream-') ? 1 : 0;
  const bStream = b.id.startsWith('agent-stream-') ? 1 : 0;
  if (aStream !== bStream) return aStream - bStream;
  return 0;
}

export function sortMessagesChronologically(messages: Message[]): Message[] {
  return [...messages].sort(compareMessages);
}

export function agentStreamIdForTurn(turnClientId: string): string {
  return `agent-stream-${turnClientId}`;
}

export function agentReplyClientId(turnClientId: string): string {
  return `agent-reply:${turnClientId}`;
}

/** After server ack, keep the live stream bubble strictly after the user row. */
export function bumpAgentStreamAfterUser(
  messages: Message[],
  userClientTempId: string,
  userCreatedAt: string,
): Message[] {
  const streamId = agentStreamIdForTurn(userClientTempId);
  const userTs = new Date(userCreatedAt).getTime();
  const streamCreatedAt = new Date(userTs + 1).toISOString();
  return messages.map((m) =>
    m.id === streamId ? { ...m, createdAt: streamCreatedAt } : m,
  );
}

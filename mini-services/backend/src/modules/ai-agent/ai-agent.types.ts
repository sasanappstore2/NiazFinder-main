export type AiAgentSseEvent =
  | { type: 'fee_deducted'; data: { transactionId: string; amount: number; duplicate: boolean } }
  | { type: 'thinking'; data: { delta: string } }
  | { type: 'token'; data: { delta: string } }
  | { type: 'tool_start'; data: { name: string } }
  | { type: 'done'; data: { messageId: string; content: string; userMessageId: string } }
  | { type: 'error'; data: { code: string; message: string } };

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

export interface LlmCompletionResult {
  text: string;
  toolCalls: LlmToolCall[];
}

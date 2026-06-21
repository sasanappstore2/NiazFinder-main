/** Bridges GlobalVoiceCallLayer socket to store / ChatPanel without duplicate connections. */

export type ChatSocketReplyToPayload = {
  id: string;
  content: string;
  senderFirstName: string;
  senderLastName: string;
};

export type ChatSocketSendFn = (
  conversationId: string,
  content: string,
  type?: string,
  clientTempId?: string,
  replyToId?: string,
  replyTo?: ChatSocketReplyToPayload
) => boolean;

export type ChatSocketTypingFn = (conversationId: string, isTyping: boolean) => void;
export type ChatSocketJoinFn = (conversationId: string) => void;

export type ChatSocketPreviewFn = (
  conversationId: string,
  content: string,
  clientTempId: string,
  type?: string
) => boolean;

let sendMessageFn: ChatSocketSendFn | null = null;
let previewMessageFn: ChatSocketPreviewFn | null = null;
let emitTypingFn: ChatSocketTypingFn | null = null;
let joinConversationFn: ChatSocketJoinFn | null = null;
let isConnectedFn: (() => boolean) | null = null;
let reactMessageFn: ChatSocketReactFn | null = null;
let deleteMessageFn: ChatSocketDeleteFn | null = null;
let editMessageFn: ChatSocketEditFn | null = null;
let socketConnectedFlag = false;

export type ChatSocketReactFn = (messageId: string, emoji: string) => boolean;
export type ChatSocketDeleteFn = (messageId: string, forEveryone: boolean) => boolean;
export type ChatSocketEditFn = (messageId: string, content: string) => boolean;
export type ChatSocketPinFn = (
  messageId: string,
  conversationId: string,
  unpin: boolean
) => boolean;

let pinMessageFn: ChatSocketPinFn | null = null;

export function setChatSocketConnected(connected: boolean): void {
  socketConnectedFlag = connected;
}

export function registerChatSocketBridge(handlers: {
  sendMessage: ChatSocketSendFn;
  previewMessage?: ChatSocketPreviewFn;
  emitTyping: ChatSocketTypingFn;
  joinConversation?: ChatSocketJoinFn;
  isConnected: () => boolean;
  reactToMessage?: ChatSocketReactFn;
  deleteMessage?: ChatSocketDeleteFn;
  editMessage?: ChatSocketEditFn;
  pinMessage?: ChatSocketPinFn;
}) {
  sendMessageFn = handlers.sendMessage;
  previewMessageFn = handlers.previewMessage ?? null;
  emitTypingFn = handlers.emitTyping;
  joinConversationFn = handlers.joinConversation ?? null;
  isConnectedFn = handlers.isConnected;
  reactMessageFn = handlers.reactToMessage ?? null;
  deleteMessageFn = handlers.deleteMessage ?? null;
  editMessageFn = handlers.editMessage ?? null;
  pinMessageFn = handlers.pinMessage ?? null;
}

export function unregisterChatSocketBridge() {
  sendMessageFn = null;
  previewMessageFn = null;
  emitTypingFn = null;
  joinConversationFn = null;
  isConnectedFn = null;
  reactMessageFn = null;
  deleteMessageFn = null;
  editMessageFn = null;
  pinMessageFn = null;
}

export function tryJoinConversation(conversationId: string): void {
  joinConversationFn?.(conversationId);
}

export function tryJoinConversations(conversationIds: string[]): void {
  for (const id of conversationIds) {
    if (id) joinConversationFn?.(id);
  }
}

export function isChatSocketConnected(): boolean {
  return socketConnectedFlag || (isConnectedFn?.() ?? false);
}

export function trySendMessagePreview(
  conversationId: string,
  content: string,
  clientTempId: string,
  type = 'TEXT'
): boolean {
  return previewMessageFn?.(conversationId, content, clientTempId, type) ?? false;
}

export function trySendMessageViaSocket(
  conversationId: string,
  content: string,
  type = 'TEXT',
  clientTempId?: string,
  replyToId?: string,
  replyTo?: {
    id: string;
    content: string;
    senderFirstName: string;
    senderLastName: string;
  }
): boolean {
  return sendMessageFn?.(conversationId, content, type, clientTempId, replyToId, replyTo) ?? false;
}

export function tryEmitTyping(conversationId: string, isTyping: boolean): void {
  emitTypingFn?.(conversationId, isTyping);
}

export function tryReactToMessage(messageId: string, emoji: string): boolean {
  return reactMessageFn?.(messageId, emoji) ?? false;
}

export function tryDeleteMessage(messageId: string, forEveryone: boolean): boolean {
  return deleteMessageFn?.(messageId, forEveryone) ?? false;
}

export function tryEditMessage(messageId: string, content: string): boolean {
  return editMessageFn?.(messageId, content) ?? false;
}

export function tryPinMessage(
  messageId: string,
  conversationId: string,
  unpin: boolean
): boolean {
  return pinMessageFn?.(messageId, conversationId, unpin) ?? false;
}

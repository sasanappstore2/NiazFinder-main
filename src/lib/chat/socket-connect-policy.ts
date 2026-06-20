let chatSocketConnectAllowed = false;
const policyListeners = new Set<() => void>();

function notifyPolicyListeners(): void {
  for (const listener of policyListeners) {
    listener();
  }
}

export function allowChatSocketConnect(): void {
  if (chatSocketConnectAllowed) return;
  chatSocketConnectAllowed = true;
  notifyPolicyListeners();
}

export function subscribeChatSocketConnectPolicy(listener: () => void): () => void {
  policyListeners.add(listener);
  return () => {
    policyListeners.delete(listener);
  };
}

export function isChatSocketConnectAllowed(pathname: string): boolean {
  if (chatSocketConnectAllowed) return true;
  if (pathname.startsWith('/chat')) return true;
  if (pathname.startsWith('/messages')) return true;
  return false;
}

export function resetChatSocketConnectPolicyForTests(): void {
  chatSocketConnectAllowed = false;
  policyListeners.clear();
}

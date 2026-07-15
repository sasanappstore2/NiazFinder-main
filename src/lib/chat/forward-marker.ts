/** Marker prefix for forwarded messages (no schema migration). */
export const CHAT_FORWARD_PREFIX = '__NF_FWD__\n';

export function wrapForwardedContent(content: string): string {
  if (content.startsWith(CHAT_FORWARD_PREFIX)) return content;
  return `${CHAT_FORWARD_PREFIX}${content}`;
}

export function parseForwardedContent(content: string): {
  isForwarded: boolean;
  body: string;
} {
  if (typeof content === 'string' && content.startsWith(CHAT_FORWARD_PREFIX)) {
    return {
      isForwarded: true,
      body: content.slice(CHAT_FORWARD_PREFIX.length),
    };
  }
  return { isForwarded: false, body: content };
}

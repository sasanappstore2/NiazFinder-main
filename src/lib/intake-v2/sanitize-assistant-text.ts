/** Strip chat-template leak and trim model garbage from assistant text. */
export function sanitizeAssistantText(raw: string): string {
  let text = raw.trim();
  for (const marker of ['<|user|>', '<|assistant|>', '<|system|>', '[assistant]:']) {
    const idx = text.indexOf(marker);
    if (idx >= 0) text = text.slice(0, idx).trim();
  }
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length > 220) {
    const cut = text.slice(0, 220);
    const lastSpace = cut.lastIndexOf(' ');
    text = (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim() + '…';
  }
  return text;
}

export function isAcceptableAssistantText(text: string): boolean {
  if (!text || text.length < 3) return false;
  if (/<\|(?:user|assistant|system)/.test(text)) return false;
  if (/\[assistant\]:/i.test(text)) return false;
  return true;
}

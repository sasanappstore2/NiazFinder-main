const OPEN_TAG = '<think>';
const CLOSE_TAG = '</think>';

export type ThinkStreamKind = 'thinking' | 'token';

export interface ThinkStreamDelta {
  kind: ThinkStreamKind;
  delta: string;
}

export interface ParsedThinkContent {
  thinking: string;
  answer: string;
}

/** Strip all complete <think>…</think> blocks (and orphan close tags). */
export function stripThinkTags(content: string): string {
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?think>/gi, '')
    .trim();
}

/** Parse persisted or in-flight message content into thinking + answer. */
export function parseThinkContent(content: string): ParsedThinkContent {
  if (!content) return { thinking: '', answer: '' };

  const thinkParts: string[] = [];

  const completeRe = /<think>([\s\S]*?)<\/think>/gi;
  let complete: RegExpExecArray | null;
  while ((complete = completeRe.exec(content)) !== null) {
    thinkParts.push(complete[1]!.trim());
  }

  let answer = content.replace(/<think>[\s\S]*?<\/think>/gi, '');

  // Unclosed <think>… at end (streaming / truncated)
  const lastOpen = answer.toLowerCase().lastIndexOf(OPEN_TAG);
  if (lastOpen !== -1) {
    const after = answer.slice(lastOpen + OPEN_TAG.length);
    const closeIdx = after.toLowerCase().indexOf(CLOSE_TAG);
    if (closeIdx === -1) {
      thinkParts.push(after.trim());
      answer = answer.slice(0, lastOpen);
    }
  }

  answer = answer.replace(/<\/?think>/gi, '').trim();

  return {
    thinking: thinkParts.filter(Boolean).join('\n\n'),
    answer,
  };
}

/** Build persisted assistant content with optional think wrapper. */
export function composePersistedThinkContent(thinking: string, answer: string): string {
  const t = thinking.trim();
  const a = answer.trim();
  if (!t) return a;
  if (!a) return `${OPEN_TAG}${t}${CLOSE_TAG}`;
  return `${OPEN_TAG}${t}${CLOSE_TAG}\n${a}`;
}

/**
 * Incremental parser: splits a token stream into thinking vs answer deltas.
 * Handles partial `<think>` / `</think>` tags across chunk boundaries.
 */
export class ThinkTagStreamParser {
  private buffer = '';
  private mode: 'pre' | 'thinking' | 'answer' = 'pre';

  push(chunk: string): ThinkStreamDelta[] {
    if (!chunk) return [];
    this.buffer += chunk;
    return this.drain(false);
  }

  flush(): ThinkStreamDelta[] {
    return this.drain(true);
  }

  private drain(flush: boolean): ThinkStreamDelta[] {
    const out: ThinkStreamDelta[] = [];

    while (this.buffer.length > 0) {
      if (this.mode === 'pre') {
        const lower = this.buffer.toLowerCase();
        const openIdx = lower.indexOf(OPEN_TAG);
        if (openIdx === -1) {
          // May be a partial open tag at the end
          const partial = partialSuffixMatch(this.buffer, OPEN_TAG);
          if (!flush && partial > 0) {
            const emit = this.buffer.slice(0, -partial);
            this.buffer = this.buffer.slice(-partial);
            if (emit) {
              this.mode = 'answer';
              out.push({ kind: 'token', delta: emit });
            }
            break;
          }
          if (this.buffer) {
            this.mode = 'answer';
            out.push({ kind: 'token', delta: this.buffer });
            this.buffer = '';
          }
          break;
        }

        if (openIdx > 0) {
          out.push({ kind: 'token', delta: this.buffer.slice(0, openIdx) });
        }
        this.buffer = this.buffer.slice(openIdx + OPEN_TAG.length);
        this.mode = 'thinking';
        continue;
      }

      if (this.mode === 'thinking') {
        const lower = this.buffer.toLowerCase();
        const closeIdx = lower.indexOf(CLOSE_TAG);
        if (closeIdx === -1) {
          const partial = partialSuffixMatch(this.buffer, CLOSE_TAG);
          if (!flush && partial > 0) {
            const emit = this.buffer.slice(0, -partial);
            this.buffer = this.buffer.slice(-partial);
            if (emit) out.push({ kind: 'thinking', delta: emit });
            break;
          }
          if (this.buffer) {
            out.push({ kind: 'thinking', delta: this.buffer });
            this.buffer = '';
          }
          break;
        }

        if (closeIdx > 0) {
          out.push({ kind: 'thinking', delta: this.buffer.slice(0, closeIdx) });
        }
        this.buffer = this.buffer.slice(closeIdx + CLOSE_TAG.length);
        // Drop a single leading newline after close tag
        if (this.buffer.startsWith('\n')) this.buffer = this.buffer.slice(1);
        this.mode = 'answer';
        continue;
      }

      // answer mode — still allow a late <think> block
      const lower = this.buffer.toLowerCase();
      const openIdx = lower.indexOf(OPEN_TAG);
      if (openIdx === -1) {
        const partial = partialSuffixMatch(this.buffer, OPEN_TAG);
        if (!flush && partial > 0) {
          const emit = this.buffer.slice(0, -partial);
          this.buffer = this.buffer.slice(-partial);
          if (emit) out.push({ kind: 'token', delta: emit });
          break;
        }
        if (this.buffer) {
          out.push({ kind: 'token', delta: this.buffer });
          this.buffer = '';
        }
        break;
      }

      if (openIdx > 0) {
        out.push({ kind: 'token', delta: this.buffer.slice(0, openIdx) });
      }
      this.buffer = this.buffer.slice(openIdx + OPEN_TAG.length);
      this.mode = 'thinking';
    }

    return out;
  }
}

/** Longest suffix of `text` that is a prefix of `tag` (case-insensitive). */
function partialSuffixMatch(text: string, tag: string): number {
  const max = Math.min(text.length, tag.length - 1);
  const lowerText = text.toLowerCase();
  const lowerTag = tag.toLowerCase();
  for (let n = max; n >= 1; n--) {
    if (lowerTag.startsWith(lowerText.slice(-n))) return n;
  }
  return 0;
}

/** True when stripped text looks like an agent tool-call payload (JSON or native). */
export function looksLikeAgentToolJson(text: string): boolean {
  const stripped = stripThinkTags(text).trim();
  if (!stripped) return false;
  if (/["']action["']\s*:\s*["']tool["']/i.test(stripped)) return true;
  if (/<\|?\s*tool_call/i.test(stripped)) return true;
  if (/\bcall\s*:\s*[a-z_][\w]*/i.test(stripped)) return true;
  if (stripped.startsWith('{') && /"action"\s*:\s*"tool"/i.test(stripped)) return true;
  return false;
}

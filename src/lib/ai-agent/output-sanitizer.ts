/**
 * Strip tool-call / protocol leakage before SSE tokens or DB persist.
 * Safe to run on the client (no Node-only APIs).
 */

import { parseThinkContent, composePersistedThinkContent } from '@/lib/ai-agent/think-tag-parser';

const TOOL_LEAK_PATTERNS: RegExp[] = [
  /```(?:json)?\s*\{[\s\S]*?"action"\s*:\s*"tool"[\s\S]*?\}\s*```/gi,
  /\{\s*"action"\s*:\s*"tool"[\s\S]*?\}/gi,
  /<\|?\s*tool_call\|?\s*>[\s\S]*?(?:<\/?\s*\|?\s*tool_call\|?\s*>|<\|?\s*tool_call\|?\s*>)/gi,
  /<\|?\s*tool_call\|?\s*>[\s\S]*/gi,
  /\bcall\s*:\s*[a-zA-Z_][\w]*\s*(?:\{[\s\S]*?\}|\([\s\S]*?\))?/gi,
  /\[tool_call:[^\]]+\]/gi,
  /\[tool:[^\]]+\]\s*\{[\s\S]*?\}/gi,
];

const KNOWN_TOOL_INVOKE =
  /\b(?:check_user_account_status|search_needs_agent|get_site_categories|search_site_categories|search_site_cities|search_site_neighborhoods|explain_need_fields|get_site_help|get_user_memory|update_user_memory)\s*(?:\{[\s\S]*?\}|\([\s\S]*?\))/gi;

/** True if text still contains tool-protocol leakage. */
export function containsToolLeakage(text: string): boolean {
  if (!text?.trim()) return false;
  if (/["']action["']\s*:\s*["']tool["']/i.test(text)) return true;
  if (/<\|?\s*tool_call/i.test(text)) return true;
  if (/\bcall\s*:\s*[a-z_][\w]*/i.test(text)) return true;
  if (/\[tool_call:/i.test(text)) return true;
  return false;
}

/** Remove tool-call syntax and protocol noise from user-facing text. */
export function sanitizeAgentVisibleText(
  text: string,
  opts?: { trim?: boolean },
): string {
  if (!text) return '';
  let out = text;
  for (const re of TOOL_LEAK_PATTERNS) {
    out = out.replace(re, '');
  }
  out = out.replace(KNOWN_TOOL_INVOKE, '');
  // Drop orphan tool markers
  out = out.replace(/<\/?\s*\|?\s*tool_call\|?\s*>/gi, '');
  out = out.replace(/<\|tool_response\|>/gi, '');
  out = out.replace(/\n{3,}/g, '\n\n');
  // Never trim during streaming — that eats spaces between Persian words.
  if (opts?.trim !== false) {
    out = out.trim();
  }
  return out;
}

/**
 * Sanitize one streaming chunk / in-progress buffer without trimming.
 * Use for live token accumulation; call sanitizeAgentVisibleText on final content.
 */
export function sanitizeAgentStreamChunk(text: string): string {
  return sanitizeAgentVisibleText(text, { trim: false });
}

/**
 * Sanitize persisted assistant content while preserving a clean <think> block.
 */
export function sanitizePersistedAgentContent(content: string): string {
  if (!content?.trim()) return '';
  const { thinking, answer } = parseThinkContent(content);
  const cleanThinking = sanitizeAgentVisibleText(thinking);
  const cleanAnswer = sanitizeAgentVisibleText(answer);
  return composePersistedThinkContent(cleanThinking, cleanAnswer);
}

/** Fallback Persian message when sanitization empties the answer. */
export const AGENT_EMPTY_AFTER_SANITIZE =
  'متوجه منظورتان شدم، ولی الان نتوانستم پاسخ کامل بسازم. لطفاً سوال را کمی واضح‌تر بپرسید.';

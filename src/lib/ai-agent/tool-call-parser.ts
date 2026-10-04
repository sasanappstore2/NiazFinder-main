/** Multi-format tool-call extraction for local Gemma / chat-template models. */

export interface ParsedToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolParseResult {
  toolCalls: ParsedToolCall[];
  /** Remaining user-facing text after tool payloads are removed (may still need sanitizing). */
  residualText: string;
}

const KNOWN_TOOLS = new Set([
  'check_user_account_status',
  'search_needs_agent',
  'search_businesses_agent',
  'get_public_business_profile',
  'search_site_knowledge',
  'get_site_categories',
  'search_site_categories',
  'search_site_cities',
  'search_site_neighborhoods',
  'explain_need_fields',
  'get_site_help',
  'get_user_memory',
  'update_user_memory',
]);

function makeId(): string {
  return `tool_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeArgs(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* ignore */
    }
  }
  return {};
}

function normalizeToolName(name: string): string | null {
  const n = name.trim().replace(/[^\w.-]/g, '');
  if (!n) return null;
  if (KNOWN_TOOLS.has(n)) return n;
  const lower = n.toLowerCase();
  for (const known of KNOWN_TOOLS) {
    if (known.toLowerCase() === lower) return known;
  }
  // Accept unknown names that look like snake_case tools (forward-compatible)
  if (/^[a-z][a-z0-9_]{2,64}$/i.test(n)) return n;
  return null;
}

function parseArgObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  // JSON object
  if (trimmed.startsWith('{')) {
    try {
      return safeArgs(JSON.parse(trimmed));
    } catch {
      /* fall through to key:value */
    }
  }
  // query: "خودرو" or query: خودرو
  const out: Record<string, unknown> = {};
  const kvRe =
    /([a-zA-Z_][\w]*)\s*[:=]\s*(?:"([^"]*)"|'([^']*)'|([^,}\]]+))/g;
  let m: RegExpExecArray | null;
  while ((m = kvRe.exec(trimmed)) !== null) {
    const key = m[1]!;
    const val = (m[2] ?? m[3] ?? m[4] ?? '').trim();
    const asNum = Number(val);
    out[key] = Number.isFinite(asNum) && val !== '' && !/[^\d.-]/.test(val) ? asNum : val;
  }
  return out;
}

function pushCall(
  calls: ParsedToolCall[],
  name: string,
  args: Record<string, unknown>,
): void {
  const normalized = normalizeToolName(name);
  if (!normalized) return;
  if (calls.some((c) => c.name === normalized && JSON.stringify(c.arguments) === JSON.stringify(args))) {
    return;
  }
  calls.push({ id: makeId(), name: normalized, arguments: args });
}

/** Detect any tool-call-looking payload (for history filtering / stream suppression). */
export function looksLikeToolCallPayload(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/["']action["']\s*:\s*["']tool["']/i.test(t)) return true;
  if (/<\|?\s*tool_call/i.test(t)) return true;
  if (/\bcall\s*:\s*[a-z_][\w]*/i.test(t)) return true;
  if (/\[tool_call:/i.test(t)) return true;
  if (/^\{\s*"action"\s*:\s*"tool"/i.test(t)) return true;
  return false;
}

/**
 * Extract tool calls from model output in multiple formats.
 * Returns residual text with tool payloads stripped.
 */
export function parseToolCallsFromContent(content: string): ToolParseResult {
  if (!content?.trim()) return { toolCalls: [], residualText: '' };

  let residual = content;
  const toolCalls: ParsedToolCall[] = [];

  // 1) JSON action:tool (possibly markdown-fenced)
  const jsonRe =
    /```(?:json)?\s*([\s\S]*?)```|(\{\s*"action"\s*:\s*"tool"[\s\S]*?\})/gi;
  residual = residual.replace(jsonRe, (full, fenced, bare) => {
    const chunk = (fenced ?? bare ?? full).trim();
    try {
      const start = chunk.indexOf('{');
      const end = chunk.lastIndexOf('}');
      if (start < 0 || end <= start) return full;
      const obj = JSON.parse(chunk.slice(start, end + 1)) as {
        action?: string;
        name?: string;
        arguments?: unknown;
        args?: unknown;
      };
      if (obj.action === 'tool' && obj.name) {
        pushCall(toolCalls, obj.name, safeArgs(obj.arguments ?? obj.args));
        return '';
      }
    } catch {
      /* keep */
    }
    return full;
  });

  // Also try whole-string JSON
  if (toolCalls.length === 0) {
    const stripped = residual.trim();
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        const obj = JSON.parse(stripped.slice(start, end + 1)) as {
          action?: string;
          name?: string;
          arguments?: unknown;
          args?: unknown;
        };
        if (obj.action === 'tool' && obj.name) {
          pushCall(toolCalls, obj.name, safeArgs(obj.arguments ?? obj.args));
          residual = '';
        }
      } catch {
        /* ignore */
      }
    }
  }

  // 2) <|tool_call|>… / <|tool_call>… / <tool_call>…
  const tagRe =
    /<\|?\s*tool_call\|?\s*>[\s\S]*?(?:call\s*:?\s*)?([a-zA-Z_][\w]*)\s*(?:\{([\s\S]*?)\}|\(([\s\S]*?)\))?[\s\S]*?(?:<\/?\s*\|?\s*tool_call\|?\s*>|<\|?\s*tool_call\|?\s*>)/gi;
  residual = residual.replace(tagRe, (_full, name: string, braceArgs?: string, parenArgs?: string) => {
    pushCall(toolCalls, name, parseArgObject(braceArgs ?? parenArgs ?? ''));
    return '';
  });

  // 3) Loose: call: search_site_categories{query: "خودرو"} or call search_site_categories(...)
  const callRe =
    /\bcall\s*:?\s*([a-zA-Z_][\w]*)\s*(?:\{([\s\S]*?)\}|\(([\s\S]*?)\))?/gi;
  residual = residual.replace(callRe, (full, name: string, braceArgs?: string, parenArgs?: string) => {
    const normalized = normalizeToolName(name);
    if (!normalized) return full;
    pushCall(toolCalls, normalized, parseArgObject(braceArgs ?? parenArgs ?? ''));
    return '';
  });

  // 4) Bare known tool invocation: search_site_categories{query:"x"}
  for (const known of KNOWN_TOOLS) {
    const bareRe = new RegExp(
      `\\b${known}\\s*(?:\\{([\\s\\S]*?)\\}|\\(([\\s\\S]*?)\\))`,
      'gi',
    );
    residual = residual.replace(bareRe, (_full, braceArgs?: string, parenArgs?: string) => {
      pushCall(toolCalls, known, parseArgObject(braceArgs ?? parenArgs ?? ''));
      return '';
    });
  }

  return {
    toolCalls,
    residualText: residual.replace(/\n{3,}/g, '\n\n').trim(),
  };
}

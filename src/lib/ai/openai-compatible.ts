/**
 * Minimal OpenAI-compatible client for LM Studio (chat/completions + models).
 */

import {
  getLmStudioApiKey,
  getLmStudioBaseUrl,
  getLmStudioModel,
  getNeedIntakeAiTimeoutMs,
} from '@/lib/ai/env';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  jsonMode?: boolean;
  temperature?: number;
  timeoutMs?: number;
  model?: string;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
}

let cachedDefaultModel: string | null = null;

function authHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getLmStudioApiKey()}`,
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve model id — env override or first model from LM Studio. */
export async function resolveModelId(): Promise<string> {
  const configured = getLmStudioModel();
  if (configured) return configured;
  if (cachedDefaultModel) return cachedDefaultModel;

  const base = getLmStudioBaseUrl();
  const res = await fetchWithTimeout(
    `${base}/models`,
    { method: 'GET', headers: authHeaders() },
    5000
  );
  if (!res.ok) {
    throw new Error(`LM Studio models list failed: ${res.status}`);
  }
  const data = (await res.json()) as { data?: { id: string }[] };
  const id = data.data?.[0]?.id;
  if (!id) throw new Error('No models loaded in LM Studio');
  cachedDefaultModel = id;
  return id;
}

export async function chatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const base = getLmStudioBaseUrl();
  const model = options.model ?? (await resolveModelId());
  const timeoutMs = options.timeoutMs ?? getNeedIntakeAiTimeoutMs();

  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.2,
    stream: false,
  };
  if (options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const post = async (withJsonMode: boolean) => {
    const payload = { ...body };
    if (withJsonMode) {
      payload.response_format = { type: 'json_object' };
    } else {
      delete payload.response_format;
    }
    return fetchWithTimeout(
      `${base}/chat/completions`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      },
      timeoutMs
    );
  };

  let res = await post(Boolean(options.jsonMode));
  if (!res.ok && options.jsonMode) {
    res = await post(false);
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`LM Studio chat failed: ${res.status} ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    model?: string;
  };
  const content = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (!content) throw new Error('Empty response from LM Studio');

  return { content, model: data.model ?? model };
}

/** Extract JSON object from model text (markdown fence or raw). */
export function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? text).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object in model response');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/** Ping LM Studio for health checks (models list — fast). */
export async function pingLmStudio(): Promise<{
  ok: boolean;
  model?: string;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const model = await resolveModelId();
    return {
      ok: true,
      model,
      latencyMs: Date.now() - start,
    };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

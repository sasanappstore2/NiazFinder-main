import {
  getGeminiApiKey,
  getGeminiBaseUrl,
  getGeminiModelId,
  getGeminiTimeoutMs,
} from '@/lib/gemini/config';

export interface GeminiContentPart {
  text: string;
}

export interface GeminiGenerateContentRequest {
  contents: Array<{
    role?: 'user' | 'model';
    parts: GeminiContentPart[];
  }>;
  systemInstruction?: { parts: GeminiContentPart[] };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
}

export interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number };
}

export async function geminiGenerateContent(
  request: GeminiGenerateContentRequest,
  opts?: { model?: string; timeoutMs?: number }
): Promise<{ text: string | null; raw: GeminiGenerateContentResponse | null }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return { text: null, raw: null };

  const model = opts?.model ?? getGeminiModelId();
  const url = `${getGeminiBaseUrl()}/models/${encodeURIComponent(model)}:generateContent`;
  const timeoutMs = opts?.timeoutMs ?? getGeminiTimeoutMs();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    const raw = (await res.json().catch(() => null)) as GeminiGenerateContentResponse | null;
    if (!res.ok || !raw) {
      const msg = raw?.error?.message ?? `Gemini HTTP ${res.status}`;
      console.warn('[gemini]', msg);
      return { text: null, raw };
    }

    const text =
      raw.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? '')
        .join('')
        .trim() ?? null;

    return { text: text || null, raw };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn('[gemini] request timed out');
    } else {
      console.warn('[gemini]', err instanceof Error ? err.message : err);
    }
    return { text: null, raw: null };
  } finally {
    clearTimeout(timer);
  }
}

/** Map OpenAI-style chat messages to Gemini generateContent payload. */
export function chatMessagesToGeminiRequest(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  opts?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): GeminiGenerateContentRequest {
  let systemInstruction: GeminiGenerateContentRequest['systemInstruction'];
  const contents: GeminiGenerateContentRequest['contents'] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = { parts: [{ text: msg.content }] };
      continue;
    }
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }

  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
  }

  return {
    contents,
    ...(systemInstruction ? { systemInstruction } : {}),
    generationConfig: {
      temperature: opts?.temperature ?? 0.2,
      maxOutputTokens: opts?.maxTokens ?? 1024,
      ...(opts?.jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  };
}

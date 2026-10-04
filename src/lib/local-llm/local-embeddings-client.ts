/**
 * Embeddings via the local OpenAI-compatible gateway (LM Studio :1234).
 *
 * Mirrors local-chat-client but hits POST /v1/embeddings. Used by the semantic
 * category retriever — fully offline. Default model is the embedding model
 * loaded in LM Studio; override with LOCAL_EMBED_MODEL.
 *
 * Nomic-family models expect task prefixes ("search_query:" / "search_document:").
 * Pass `prefix` so retrieval quality matches how the model was trained.
 */
import { getLocalLlmBaseUrl, getLocalLlmTimeoutMs } from '@/lib/local-llm/config';

export const DEFAULT_LOCAL_EMBED_MODEL = 'text-embedding-nomic-embed-text-v1.5';

export function getLocalEmbedModelId(): string {
  return (process.env.LOCAL_EMBED_MODEL ?? DEFAULT_LOCAL_EMBED_MODEL).trim();
}

/** Embedding gateway base URL — defaults to the LLM gateway, overridable via LOCAL_EMBED_URL. */
export function getLocalEmbedBaseUrl(): string {
  const override = process.env.LOCAL_EMBED_URL;
  if (override) return override.replace(/\/$/, '').replace(/\/v1$/, '');
  return getLocalLlmBaseUrl();
}

export function localEmbeddingsUrl(): string {
  return `${getLocalEmbedBaseUrl()}/v1/embeddings`;
}

export interface EmbedOptions {
  model?: string;
  /** Optional nomic task prefix, e.g. "search_query: " or "search_document: ". */
  prefix?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

async function postEmbeddings(
  inputs: string[],
  opts?: EmbedOptions
): Promise<number[][] | null> {
  const model = opts?.model ?? getLocalEmbedModelId();
  const timeoutMs = opts?.timeoutMs ?? getLocalLlmTimeoutMs();
  const maxRetries = opts?.maxRetries ?? 2;
  const url = localEmbeddingsUrl();
  const body = JSON.stringify({
    model,
    input: opts?.prefix ? inputs.map((t) => `${opts.prefix}${t}`) : inputs,
  });

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });
      if (!res.ok) {
        if (attempt < maxRetries && res.status >= 500) continue;
        return null;
      }
      const json = (await res.json()) as {
        data?: Array<{ embedding?: number[]; index?: number }>;
      };
      const rows = json.data;
      if (!rows?.length) return null;
      // Preserve input order (OpenAI returns `index`).
      const out: number[][] = new Array(inputs.length);
      rows.forEach((r, i) => {
        const idx = typeof r.index === 'number' ? r.index : i;
        if (r.embedding) out[idx] = r.embedding;
      });
      if (out.some((v) => !v)) return null;
      return out;
    } catch {
      if (attempt === maxRetries) return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

/** Embed a single text. Returns null if the gateway is unreachable. */
export async function embedText(
  text: string,
  opts?: EmbedOptions
): Promise<number[] | null> {
  const res = await postEmbeddings([text], opts);
  return res?.[0] ?? null;
}

/** Embed many texts in one request (chunked to keep payloads sane). */
export async function embedBatch(
  texts: string[],
  opts?: EmbedOptions & { chunkSize?: number }
): Promise<number[][] | null> {
  if (texts.length === 0) return [];
  const chunkSize = opts?.chunkSize ?? 64;
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += chunkSize) {
    const chunk = texts.slice(i, i + chunkSize);
    const res = await postEmbeddings(chunk, opts);
    if (!res) return null;
    out.push(...res);
  }
  return out;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function checkLocalEmbedHealth(): Promise<{
  ok: boolean;
  dims?: number;
  error?: string;
}> {
  try {
    const v = await embedText('سلام', { maxRetries: 0, timeoutMs: 8000 });
    if (!v) return { ok: false, error: 'no embedding returned' };
    return { ok: true, dims: v.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unreachable' };
  }
}

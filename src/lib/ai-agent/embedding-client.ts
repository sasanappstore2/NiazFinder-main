const DEFAULT_EMBED_URL = 'http://127.0.0.1:8102';
const DEFAULT_EMBED_MODEL = 'multilingual-e5-small';

export function embedLlmUrl(): string {
  return (process.env.EMBED_LLM_URL ?? DEFAULT_EMBED_URL).replace(/\/$/, '');
}

export function embedModelId(): string {
  return process.env.EMBED_MODEL ?? DEFAULT_EMBED_MODEL;
}

export function embedDimension(): number {
  return Number(process.env.EMBED_DIMENSION ?? 384);
}

async function fetchEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${embedLlmUrl()}/v1/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: embedModelId(),
      input: texts.length === 1 ? texts[0] : texts,
    }),
    signal: AbortSignal.timeout(Number(process.env.EMBED_TIMEOUT_MS ?? 30_000)),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Embedding API error ${res.status}: ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };
  const vectors = (json.data ?? []).map((d) => d.embedding ?? []);
  if (vectors.length !== texts.length || vectors.some((v) => v.length === 0)) {
    throw new Error('Embedding API returned invalid vectors');
  }
  return vectors;
}

export async function embedPassage(text: string): Promise<number[]> {
  const [vec] = await fetchEmbeddings([`passage: ${text}`]);
  return vec;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await fetchEmbeddings([`query: ${text}`]);
  return vec;
}

export async function embedPassagesBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  return fetchEmbeddings(texts.map((t) => `passage: ${t}`));
}

export function buildServiceRequestSearchText(row: {
  title: string;
  description: string;
  city?: string | null;
  province?: string | null;
  address?: string | null;
  categoryName?: string | null;
}): string {
  return [
    row.title,
    row.description,
    row.categoryName ?? '',
    [row.city, row.province, row.address].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join('\n')
    .trim();
}

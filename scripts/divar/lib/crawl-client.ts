const DEFAULT_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const DIVAR_FETCH_HEADERS: Record<string, string> = {
  'User-Agent': DEFAULT_UA,
  'Accept-Language': 'fa-IR,fa;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Cache-Control': 'no-cache',
};

const MIN_SSR_HTML_BYTES = 120_000;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function decodeDivarJsonString(raw: string): string {
  try {
    return JSON.parse(`"${raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`) as string;
  } catch {
    return raw.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
  }
}

/** Divar embeds listing rows in SSR HTML when not rate-limited. */
export async function fetchDivarCategoryHtml(
  citySlug: string,
  categorySlug: string,
  opts?: { retries?: number; retryDelayMs?: number }
): Promise<string> {
  const retries = opts?.retries ?? 5;
  const retryDelayMs = opts?.retryDelayMs ?? 2_500;
  const url = `https://divar.ir/s/${citySlug}/${categorySlug}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, { headers: DIVAR_FETCH_HEADERS });
    if (!res.ok) {
      throw new Error(`Divar HTTP ${res.status} for ${url}`);
    }
    const html = await res.text();
    if (html.length >= MIN_SSR_HTML_BYTES && html.includes('"web_info"')) {
      return html;
    }
    if (attempt < retries - 1) {
      await sleep(retryDelayMs * (attempt + 1));
    }
  }

  const res = await fetch(url, { headers: DIVAR_FETCH_HEADERS });
  const html = await res.text();
  if (!html.includes('"web_info"')) {
    throw new Error(`Divar SSR payload missing for ${url} (${html.length} bytes)`);
  }
  return html;
}

export type KnowledgeChunkDraft = {
  title: string;
  section: string | null;
  content: string;
  chunkIndex: number;
};

const DEFAULT_MAX_CHARS = 900;
const DEFAULT_OVERLAP = 80;

/**
 * Split markdown / plain text into heading-aware chunks under a size budget.
 * Pure function — safe for unit tests without DB.
 */
export function chunkMarkdownDocument(
  raw: string,
  opts: { maxChars?: number; overlap?: number; fallbackTitle?: string } = {},
): KnowledgeChunkDraft[] {
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  const overlap = opts.overlap ?? DEFAULT_OVERLAP;
  const fallbackTitle = opts.fallbackTitle ?? 'سند';
  const text = raw.replace(/\r\n/g, '\n').trim();
  if (!text) return [];

  const sections = splitByHeadings(text, fallbackTitle);
  const out: KnowledgeChunkDraft[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const pieces = splitLongSection(section.body, maxChars, overlap);
    for (const piece of pieces) {
      const content = piece.trim();
      if (!content) continue;
      out.push({
        title: section.title,
        section: section.section,
        content,
        chunkIndex,
      });
      chunkIndex += 1;
    }
  }

  return out;
}

function splitByHeadings(
  text: string,
  fallbackTitle: string,
): Array<{ title: string; section: string | null; body: string }> {
  const lines = text.split('\n');
  const sections: Array<{ title: string; section: string | null; body: string }> = [];
  let currentTitle = fallbackTitle;
  let currentSection: string | null = null;
  let buf: string[] = [];

  const flush = () => {
    const body = buf.join('\n').trim();
    if (!body) return;
    sections.push({ title: currentTitle, section: currentSection, body });
    buf = [];
  };

  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flush();
      currentTitle = heading[1].trim();
      currentSection = currentTitle;
      continue;
    }
    buf.push(line);
  }
  flush();

  if (sections.length === 0) {
    return [{ title: fallbackTitle, section: null, body: text }];
  }
  return sections;
}

function splitLongSection(body: string, maxChars: number, overlap: number): string[] {
  if (body.length <= maxChars) return [body];

  const parts: string[] = [];
  let start = 0;
  while (start < body.length) {
    let end = Math.min(body.length, start + maxChars);
    if (end < body.length) {
      const slice = body.slice(start, end);
      const breakAt = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('\n'), slice.lastIndexOf(' '));
      if (breakAt > maxChars * 0.4) {
        end = start + breakAt;
      }
    }
    parts.push(body.slice(start, end).trim());
    if (end >= body.length) break;
    start = Math.max(0, end - overlap);
  }
  return parts.filter(Boolean);
}

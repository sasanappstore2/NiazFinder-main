import { db } from '@/lib/db';
import { normalizeTypingText } from './normalize-text';

/** Lightweight duplicate hint (title/description overlap). */
export async function detectDuplicate(
  text: string
): Promise<{ likely: boolean; matchIds?: string[] }> {
  const norm = normalizeTypingText(text);
  if (norm.length < 12) return { likely: false };

  const snippet = norm.slice(0, 40);
  if (snippet.length < 8) return { likely: false };

  try {
    const rows = await db.serviceRequest.findMany({
      where: {
        status: 'OPEN',
        OR: [
          { title: { contains: snippet } },
          { description: { contains: snippet } },
        ],
      },
      select: { id: true },
      take: 3,
    });

    if (rows.length === 0) return { likely: false };
    return { likely: true, matchIds: rows.map((r) => r.id) };
  } catch {
    return { likely: false };
  }
}

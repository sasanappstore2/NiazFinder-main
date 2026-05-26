/**
 * Server-safe JSON-LD embed (use in Server Components).
 * Prefer this over `next/script` for structured data — React 19 does not run
 * script children when hydrating client-rendered trees.
 */
export function JsonLd({
  id,
  data,
}: {
  id?: string;
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  const items = Array.isArray(data) ? data : [data];

  return (
    <>
      {items.map((item, index) => (
        <script
          key={id ? `${id}-${index}` : `jsonld-${index}`}
          {...(id && index === 0 ? { id } : {})}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}

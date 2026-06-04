import { resolveBrowseSeoBlock } from '@/content/seo/browse-seo-content';

export function BrowseSeoContent({
  market,
  locationSlug,
  categorySlug,
}: {
  market: 'need' | 'business';
  locationSlug: string;
  categorySlug?: string;
}) {
  const block = resolveBrowseSeoBlock(market, locationSlug, categorySlug);
  if (!block) return null;

  return (
    <section
      className="sr-only"
      aria-label={block.title}
      data-browse-seo={market}
    >
      <h2>{block.title}</h2>
      {block.paragraphs.map((p) => (
        <p key={p.slice(0, 24)}>{p}</p>
      ))}
    </section>
  );
}

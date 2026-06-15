export type BreadcrumbCrumb = { label: string; href: string };

export function crumbsFromJsonLd(
  itemListElement: { name: string; item: string }[],
  siteUrl: string
): BreadcrumbCrumb[] {
  return itemListElement.map((el) => {
    const href = el.item.startsWith(siteUrl)
      ? el.item.slice(siteUrl.length) || '/'
      : el.item;
    return { label: el.name, href };
  });
}

import { SITE_NAME, SITE_URL } from '@/lib/constants';
import type { Business } from '@/contracts/business-profile';

export function buildLocalBusinessJsonLd(business: Business) {
  const url = `${SITE_URL}${business.seo.canonicalUrl ?? `/pro/${business.id}`}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description: business.identity.description,
    url,
    image: business.identity.logo,
    address: {
      '@type': 'PostalAddress',
      addressLocality: business.identity.location.city,
      streetAddress: business.identity.location.address,
      addressRegion: business.identity.location.province,
    },
    geo: business.identity.location.geo
      ? {
          '@type': 'GeoCoordinates',
          latitude: business.identity.location.geo.lat,
          longitude: business.identity.location.geo.lng,
        }
      : undefined,
    aggregateRating:
      business.trust.reviewCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: business.trust.rating,
            reviewCount: business.trust.reviewCount,
          }
        : undefined,
    telephone: business.contact.phone,
    priceRange: business.offers[0]?.priceRange,
    makesOffer: business.offers.map((o) => ({
      '@type': 'Offer',
      name: o.title,
      description: o.description,
      priceSpecification: o.priceRange
        ? { '@type': 'PriceSpecification', price: o.priceRange }
        : undefined,
    })),
    publisher: { '@type': 'Organization', name: SITE_NAME },
  };
}

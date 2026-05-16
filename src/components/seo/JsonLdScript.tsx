'use client';

import { useMemo } from 'react';
import {
  createOrganizationSchema,
  createWebsiteSchema,
  schemaToJsonLd,
} from '@/lib/seo/json-ld';

/**
 * JSON-LD Script Component
 * Generates structured data for search engines (Google Rich Results)
 * Renders Organization + WebSite schemas in the root layout
 */
export function JsonLdScript() {
  const schemas = useMemo(() => {
    return [
      schemaToJsonLd(createOrganizationSchema()),
      schemaToJsonLd(createWebsiteSchema()),
    ];
  }, []);

  return (
    <>
      {schemas.map((json, index) => (
        <script
          key={index}
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: json }}
        />
      ))}
    </>
  );
}

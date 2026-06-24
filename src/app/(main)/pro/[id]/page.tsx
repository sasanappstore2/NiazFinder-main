import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadBusinessForProRoute } from '@/lib/business/load-profile';
import { SITE_NAME } from '@/lib/seo';
import { UniversalBusinessProfile } from '@/components/business-profile';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const business = await loadBusinessForProRoute(id);
  if (!business) return { title: `کسب‌وکار | ${SITE_NAME}` };
  return {
    title: business.seo.title,
    description: business.seo.description,
  };
}

/**
 * Dynamic Real Estate Profile Page
 * Single route /pro/{id} for all business subtypes.
 * Widgets and sections are rendered dynamically based on primary category.
 */
export default async function ProDynamicProfilePage({ params }: PageProps) {
  const { id } = await params;
  const business = await loadBusinessForProRoute(id);
  if (!business) notFound();

  // Render the universal profile (widgets will be dynamic)
  return <UniversalBusinessProfile businessId={business.id} />;
}

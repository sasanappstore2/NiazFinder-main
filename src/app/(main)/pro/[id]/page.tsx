import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { routeBuilder } from '@/config/routes';
import { loadBusinessForProRoute } from '@/lib/business/load-profile';
import { SITE_NAME } from '@/lib/seo';

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

/** Legacy `/pro/{id}` → canonical `/b/{profileSlug}` (301). */
export default async function ProProfileRedirectPage({ params }: PageProps) {
  const { id } = await params;
  const business = await loadBusinessForProRoute(id);
  if (!business?.slug) notFound();
  permanentRedirect(routeBuilder.businessProfile(business.slug));
}

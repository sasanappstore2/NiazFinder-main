import { redirect } from 'next/navigation';
import { routeBuilder } from '@/config/routes';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Business invite — redirect to referral with business context. */
export default async function BusinessInviteRedirect({ params }: PageProps) {
  const { slug } = await params;
  redirect(`${routeBuilder.referral()}?business=${encodeURIComponent(slug)}`);
}

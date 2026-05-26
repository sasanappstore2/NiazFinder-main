import { redirect } from 'next/navigation';
import { routeBuilder } from '@/config/routes';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Business review flow — redirect to submit-review with business context. */
export default async function BusinessReviewRedirect({ params }: PageProps) {
  const { slug } = await params;
  redirect(`${routeBuilder.submitReview()}?business=${encodeURIComponent(slug)}`);
}

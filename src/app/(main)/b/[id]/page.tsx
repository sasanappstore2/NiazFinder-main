import { permanentRedirect } from 'next/navigation';
import { routeBuilder } from '@/config/routes';

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Legacy /b/{id} → canonical /pro/{id} (301). */
export default async function LegacyBusinessRedirect({ params }: PageProps) {
  const { id } = await params;
  permanentRedirect(routeBuilder.pro(id));
}

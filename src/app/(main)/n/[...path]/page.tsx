import { permanentRedirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ path: string[] }>;
}

/** Legacy /n/... → canonical /v/... (301). */
export default async function LegacyNeedRedirect({ params }: PageProps) {
  const { path } = await params;
  const target = `/v/${path.map(encodeURIComponent).join('/')}`;
  permanentRedirect(target);
}

'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { routeBuilder } from '@/config/routes';

/** Legacy `/n/{id}/propose` URL — redirect to the canonical `/propose/{id}`. */
export default function LegacyNeedProposeRedirect() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.location === 'string' ? params.location : '';

  useEffect(() => {
    if (id) router.replace(routeBuilder.needPropose(id));
  }, [id, router]);

  return (
    <div
      className="flex min-h-[50vh] items-center justify-center gap-2 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-5 animate-spin" aria-hidden />
      در حال انتقال...
    </div>
  );
}

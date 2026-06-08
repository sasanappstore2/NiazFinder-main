'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/** Legacy URL — redirect to canonical /propose/[id]. */
export default function LegacyNeedProposeRedirect() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.location === 'string' ? params.location : '';

  useEffect(() => {
    if (id) router.replace(`/propose/${encodeURIComponent(id)}`);
  }, [id, router]);

  return null;
}

'use client';

import { useMemo } from 'react';
import type { Business } from '@/contracts/business-profile';
import { resolveProfileSections } from '@/lib/business/resolve-profile-sections';

export function useProfileSections(business: Business | null) {
  return useMemo(() => {
    if (!business) return null;
    return resolveProfileSections(business);
  }, [business]);
}

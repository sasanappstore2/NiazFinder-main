'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { isRealEstateBusiness } from '@/lib/business/is-real-estate-business';
import { useBusinessHub } from './BusinessHubContext';

export function BusinessHubInitializer({ children }: { children: React.ReactNode }) {
  const { refresh, loading, profile, activeTask, setActiveTask } = useBusinessHub();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!profile || activeTask !== 'filings') return;
    if (!isRealEstateBusiness(profile.occupationSlugs)) {
      setActiveTask('storefront');
    }
  }, [profile, activeTask, setActiveTask]);

  if (loading && !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        در حال بارگذاری...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        بارگذاری پروفایل ناموفق بود.
      </div>
    );
  }

  return <>{children}</>;
}

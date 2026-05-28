'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useBusinessHub } from './BusinessHubContext';

export function BusinessHubInitializer({ children }: { children: React.ReactNode }) {
  const { refresh, loading, profile } = useBusinessHub();

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

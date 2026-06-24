'use client';

import { useCallback } from 'react';
import { ChevronDown, Settings2 } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { BusinessProfileTabSettings } from '@/components/business-profile/BusinessProfileTabSettings';
import { BusinessCategoryPicker } from '@/components/business-profile/BusinessCategoryPicker';
import { BusinessProfileAdvancedForm } from './forms/BusinessProfileAdvancedForm';
import { BusinessDeletePanel } from './panels/BusinessDeletePanel';
import { BusinessLocationsPanel } from './panels/BusinessLocationsPanel';
import { useBusinessHub } from './BusinessHubContext';

export function BusinessHubAdvanced({
  onSlugSaved,
}: {
  onSlugSaved?: (data: { slug: string; name: string }) => void;
}) {
  const { refresh } = useBusinessHub();
  const handleCategorySaved = useCallback(() => {
    void refresh();
  }, [refresh]);

  return (
    <Collapsible className="rounded-xl border border-border/60">
      <CollapsibleTrigger className="flex w-full min-h-12 items-center justify-between gap-2 px-4 py-3 text-sm font-medium hover:bg-accent/50 [&[data-state=open]>svg.chevron]:rotate-180">
        <span className="flex items-center gap-2">
          <Settings2 className="size-4 text-muted-foreground" />
          تنظیمات بیشتر
        </span>
        <ChevronDown className="chevron size-4 shrink-0 text-muted-foreground transition-transform" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-6 border-t px-4 py-4">
        <BusinessProfileAdvancedForm onSaved={onSlugSaved} />

        <BusinessLocationsPanel />

        <div className="space-y-2">
          <p className="text-sm font-medium">حوزه کاری پروفایل</p>
          <p className="text-xs text-muted-foreground">حداکثر ۳ مورد (مشاغل + فروشگاه اینترنتی)</p>
          <BusinessCategoryPicker onCategorySaved={handleCategorySaved} />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">تب پیش‌فرض صفحه عمومی</p>
          <BusinessProfileTabSettings />
        </div>

        <BusinessDeletePanel />
      </CollapsibleContent>
    </Collapsible>
  );
}

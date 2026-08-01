'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceBoard } from '@/components/workspace/kanban/WorkspaceBoard';
import { routeBuilder } from '@/config/routes';

export function BusinessFilingsPanel() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          میزکار کامل با چهار ستون نیازها، فایل‌ها، همکاری و پیگیری
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href={routeBuilder.workspace()}>
            <ExternalLink className="size-3.5" />
            باز کردن تمام‌صفحه
          </Link>
        </Button>
      </div>
      <WorkspaceBoard fillHeight={false} />
    </div>
  );
}

'use client';

import Link from 'next/link';
import {
  ExternalLink,
  FileText,
  Home,
  ImageIcon,
  MapPinned,
  LayoutGrid,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toPersianDigits } from '@/lib/format/digits';
import type { RealEstateCompletionResult } from '@/lib/business/real-estate-hub-completion';
import { REAL_ESTATE_TASK_LABELS } from '@/lib/business/real-estate-hub-tasks';
import { isRealEstateListingSubtype } from '@/lib/business/real-estate-listing-subtypes';
import { useBusinessHub } from '../../BusinessHubContext';
import { useRealEstateHub } from '../RealEstateHubProvider';

export function RealEstateOverviewPanel({
  completion,
  occupationLabel,
}: {
  completion: RealEstateCompletionResult | null;
  occupationLabel: string;
}) {
  const { profile } = useBusinessHub();
  const { listings, ecosystem, navigateToTask, subtype } = useRealEstateHub();

  if (!profile) return null;

  const serviceAreas = ecosystem.serviceArea?.areas?.length ?? 0;
  const documents = ecosystem.verification?.documents?.length ?? 0;

  const stats = [
    { label: 'آگهی ثبت‌شده', value: listings.length, icon: Home, task: 'listings' as const },
    { label: 'نمونه‌کار', value: profile.portfolioCount, icon: ImageIcon, task: 'portfolio' as const },
    { label: 'محدوده خدمات', value: serviceAreas, icon: MapPinned, task: 'coverage' as const },
    { label: 'مدارک', value: documents, icon: FileText, task: 'documents' as const },
  ].filter((s) => {
    if (s.task === 'listings') return isRealEstateListingSubtype(subtype);
    if (s.task === 'portfolio') return !isRealEstateListingSubtype(subtype);
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">پیشخوان {occupationLabel}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          از اینجا پروفایل، آگهی‌ها، ویجت‌ها و مدارک خود را مدیریت کنید. بازدیدکنندگان صفحه عمومی شما
          را در آدرس زیر می‌بینند.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, task }) => (
          <button
            key={task}
            type="button"
            onClick={() => navigateToTask(task)}
            className="rounded-xl border border-border/60 bg-background p-4 text-right transition-colors hover:border-blue-500/30 hover:bg-blue-500/5"
          >
            <Icon className="mb-2 size-5 text-blue-600" />
            <p className="text-2xl font-bold">{toPersianDigits(value)}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </button>
        ))}
      </div>

      {completion && completion.percent < 100 && (
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">کارهای باقی‌مانده</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {completion.items
              .filter((i) => !i.completed)
              .map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToTask(item.taskId)}
                >
                  {item.label}
                </Button>
              ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="default" className="gap-1.5 bg-blue-600 hover:bg-blue-700" asChild>
          <Link href={profile.publicUrl} target="_blank" rel="noopener noreferrer">
            پیش‌نمایش صفحه عمومی
            <ExternalLink className="size-3.5" />
          </Link>
        </Button>
        <Button type="button" variant="outline" className="gap-1.5" onClick={() => navigateToTask('widgets')}>
          <LayoutGrid className="size-3.5" />
          {REAL_ESTATE_TASK_LABELS.widgets}
        </Button>
      </div>
    </div>
  );
}

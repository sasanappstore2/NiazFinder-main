'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { getBusinessCategoryTitle } from '@/lib/business/business-category';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { isolatePhoneDisplay } from '@/lib/chat/contact-share';
import type { BusinessOnboardingPayload } from '@/lib/business/onboarding-schema';

export function StepReview({
  values,
  publicUrl,
  publishing,
  onPublish,
}: {
  values: BusinessOnboardingPayload;
  publicUrl: string;
  publishing: boolean;
  onPublish: () => void;
}) {
  return (
    <div className="space-y-[21px]">
      <Card className="border-emerald-500/20">
        <CardContent className="space-y-[13px] p-[21px] text-sm">
          <div>
            <span className="text-muted-foreground">نام: </span>
            <span className="font-medium">{values.name}</span>
          </div>
          <div>
            <span className="text-muted-foreground">شغل / حوزهٔ کاری: </span>
            <span>
              {(values.occupationSlugs?.length
                ? values.occupationSlugs
                : values.primaryCategorySlug
                  ? [values.primaryCategorySlug]
                  : []
              )
                .map((s) => getBusinessCategoryTitle(s))
                .join(' · ')}
            </span>
          </div>
          {values.description && (
            <div>
              <span className="text-muted-foreground">معرفی: </span>
              <span>{values.description}</span>
            </div>
          )}
          <div dir="ltr" className="font-mono text-left">
            <span className="text-muted-foreground">تلفن: </span>
            {isolatePhoneDisplay(values.phone)}
          </div>
          {(values.city || values.address) && (
            <div>
              <span className="text-muted-foreground">مکان: </span>
              {[values.city, values.province, values.address].filter(Boolean).join('، ')}
            </div>
          )}
          {values.website && (
            <div dir="ltr" className="text-left break-all">
              <span className="text-muted-foreground">وب‌سایت: </span>
              {values.website}
            </div>
          )}
          {[values.instagram, values.telegram, values.bale, values.rubika, values.eitaa].some(
            Boolean
          ) && (
            <div className="text-xs text-muted-foreground">
              شبکه‌های اجتماعی در پروفایل ذخیره می‌شود.
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        با انتشار، پروفایل شما برای کاربران قابل مشاهده می‌شود و در جستجو و تطبیق نیازها ظاهر
        می‌شود.
      </p>

      <Button
        type="button"
        className="w-full bg-emerald-600 hover:bg-emerald-700"
        disabled={publishing}
        onClick={onPublish}
      >
        {publishing ? 'در حال انتشار...' : 'انتشار پروفایل'}
      </Button>

      {publicUrl && (
        <Button variant="outline" size="sm" asChild className="w-full gap-1.5">
          <Link href={publicUrl} target="_blank" rel="noopener noreferrer">
            پیش‌نمایش آدرس عمومی
            <ExternalLink className="size-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );
}

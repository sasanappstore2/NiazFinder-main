import type { Metadata } from 'next';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { routeBuilder } from '@/config/routes';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: `پشتیبانی | ${SITE_NAME}`,
  description: `راهنما و پشتیبانی ${SITE_NAME} — پاسخ به سوالات متداول و تماس با تیم.`,
};

export default function HelpPage() {
  return (
    <PageContainer width="medium" className="pb-16">
      <Breadcrumb />
      <Separator className="my-4" />

      <h1 className="text-2xl font-bold mb-2">پشتیبانی و راهنما</h1>
      <p className="text-muted-foreground mb-8 leading-relaxed">
        در این بخش می‌توانید پاسخ سوالات رایج را پیدا کنید یا از طریق پیام با تیم {SITE_NAME} در
        ارتباط باشید.
      </p>

      <div className="grid gap-4">
        <section className="rounded-2xl border border-border/60 bg-card p-6">
          <h2 className="font-semibold mb-2">ثبت نیاز</h2>
          <p className="text-sm text-muted-foreground mb-4">
            برای ثبت نیاز رایگان، از دکمه «ثبت نیاز» در صفحه اصلی استفاده کنید یا مستقیماً به
            صفحه ثبت نیاز بروید.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={routeBuilder.needNew()}>ثبت نیاز</Link>
          </Button>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-6">
          <h2 className="font-semibold mb-2">جستجو و فیلتر</h2>
          <p className="text-sm text-muted-foreground mb-4">
            از مسیر <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/s/iran</code> برای
            جستجوی سراسری، <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/s/mashhad</code>{' '}
            برای یک شهر، و پارامتر <code className="text-xs bg-muted px-1.5 py-0.5 rounded">?cities=</code>{' '}
            برای چند شهر همزمان استفاده کنید.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={routeBuilder.search()}>مشاهده آگهی‌ها</Link>
          </Button>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-6">
          <h2 className="font-semibold mb-2">پیام‌ها</h2>
          <p className="text-sm text-muted-foreground mb-4">
            برای گفتگو با کاربران و کسب‌وکارها به بخش چت بروید.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={routeBuilder.chat()}>رفتن به چت</Link>
          </Button>
        </section>
      </div>
    </PageContainer>
  );
}

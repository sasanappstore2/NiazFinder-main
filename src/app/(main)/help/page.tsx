import type { Metadata } from 'next';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageChrome } from '@/components/layout/PageChrome';
import { Button } from '@/components/ui/button';
import { PanelCard } from '@/components/shared/PanelCard';
import { routeBuilder } from '@/config/routes';
import { SITE_LABELS } from '@/config/site-labels';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: `${SITE_LABELS.support} | ${SITE_NAME}`,
  description: `راهنما و پشتیبانی ${SITE_NAME} — پاسخ به سوالات متداول و تماس با تیم.`,
};

export default function HelpPage() {
  return (
    <PageContainer width="medium" className="min-w-0 space-y-6 pb-16">
      <PageChrome
        title={SITE_LABELS.help}
        description={`در این بخش می‌توانید پاسخ سوالات رایج را پیدا کنید یا از طریق پیام با تیم ${SITE_NAME} در ارتباط باشید.`}
      />

      <div className="layout-stack space-y-4">
        <PanelCard>
          <h2 className="text-h3 font-semibold mb-2">ثبت نیاز (ویزارد /post)</h2>
          <p className="text-body-sm text-muted-foreground mb-4">
            فرم چهارمرحله‌ای ثبت نیاز: نیاز، توضیحات، دسته و مکان، پیش‌نمایش.
          </p>
          <ul className="mb-4 space-y-2 text-body-sm text-muted-foreground">
            <li id="intake-need"><strong>مرحله نیاز</strong> — متن اصلی نیاز را بنویسید.</li>
            <li id="intake-details"><strong>توضیحات</strong> — جزئیات اختیاری.</li>
            <li id="intake-location"><strong>دسته و مکان</strong> — دسته‌بندی، شهر و محله.</li>
            <li id="intake-preview"><strong>پیش‌نمایش</strong> — بازبینی عنوان و انتشار.</li>
          </ul>
          <Button asChild variant="outline" size="sm">
            <Link href={routeBuilder.needNew()}>{SITE_LABELS.postNeed}</Link>
          </Button>
        </PanelCard>

        <PanelCard>
          <h2 className="text-h3 font-semibold mb-2">جستجو و فیلتر</h2>
          <p className="text-body-sm text-muted-foreground mb-4">
            از مسیر <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/n/iran</code> برای
            جستجوی سراسری استفاده کنید.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={routeBuilder.search({ market: 'need' })}>{SITE_LABELS.marketplaceNeeds}</Link>
          </Button>
        </PanelCard>

        <PanelCard>
          <h2 className="text-h3 font-semibold mb-2">{SITE_LABELS.messages}</h2>
          <p className="text-body-sm text-muted-foreground mb-4">
            برای گفتگو با کاربران و کسب‌وکارها به بخش چت بروید.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={routeBuilder.chat()}>رفتن به چت</Link>
          </Button>
        </PanelCard>
      </div>
    </PageContainer>
  );
}

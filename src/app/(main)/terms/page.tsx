import type { Metadata } from 'next';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageChrome } from '@/components/layout/PageChrome';
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';
import { LEGAL_ENTITY } from '@/content/legal/legal-entity';
import { TERMS_OF_SERVICE_FA } from '@/content/legal/terms-of-service.fa';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import { routeBuilder } from '@/config/routes';
import { SITE_LABELS } from '@/config/site-labels';

export const metadata: Metadata = {
  title: `${SITE_LABELS.terms} | ${SITE_NAME}`,
  description: `قوانین و شرایط استفاده از ${SITE_NAME} — حقوق و تکالیف کاربران، ثبت نیاز، پروفایل کسب‌وکار، چت، پرداخت و سایر خدمات پلتفرم.`,
  alternates: { canonical: `${SITE_URL}/terms` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `${SITE_LABELS.terms} | ${SITE_NAME}`,
    description: `شرایط استفاده از پلتفرم ${SITE_NAME}`,
    url: `${SITE_URL}/terms`,
    type: 'website',
  },
};

export default function TermsPage() {
  return (
    <PageContainer width="medium" className="space-y-6 pb-16">
      <PageChrome title={SITE_LABELS.terms} />
      <LegalDocumentPage
        meta={{
          title: 'قوانین و شرایط استفاده',
          description: `این سند شرایط استفاده از وب‌سایت و سرویس‌های ${LEGAL_ENTITY.brandName} را برای کارفرمایان، کسب‌وکارها و سایر کاربران توضیح می‌دهد. لطفاً پیش از ثبت‌نام یا استفاده از خدمات، آن را با دقت مطالعه کنید.`,
          version: LEGAL_ENTITY.version,
          effectiveDate: LEGAL_ENTITY.effectiveDate,
          privacyHref: '/privacy',
          helpHref: routeBuilder.help(),
        }}
        sections={TERMS_OF_SERVICE_FA}
      />
    </PageContainer>
  );
}

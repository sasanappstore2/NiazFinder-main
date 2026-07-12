import type { Metadata } from 'next';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageChrome } from '@/components/layout/PageChrome';
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';
import { LEGAL_ENTITY } from '@/content/legal/legal-entity';
import { PRIVACY_POLICY_FA } from '@/content/legal/privacy-policy.fa';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import { routeBuilder } from '@/config/routes';
import { SITE_LABELS } from '@/config/site-labels';

export const metadata: Metadata = {
  title: `${SITE_LABELS.privacy} | ${SITE_NAME}`,
  description: `سیاست حریم خصوصی ${SITE_NAME} — نحوه جمع‌آوری، استفاده و حفاظت از اطلاعات شخصی کاربران.`,
  alternates: { canonical: `${SITE_URL}/privacy` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `${SITE_LABELS.privacy} | ${SITE_NAME}`,
    description: `سیاست حریم خصوصی پلتفرم ${SITE_NAME}`,
    url: `${SITE_URL}/privacy`,
    type: 'website',
  },
};

export default function PrivacyPage() {
  return (
    <PageContainer width="medium" className="space-y-6 pb-16">
      <PageChrome title={SITE_LABELS.privacy} />
      <LegalDocumentPage
        meta={{
          title: 'سیاست حریم خصوصی',
          description: `این سند نحوه برخورد ${LEGAL_ENTITY.brandName} با اطلاعات شخصی کاربران را توضیح می‌دهد.`,
          version: LEGAL_ENTITY.version,
          effectiveDate: LEGAL_ENTITY.effectiveDate,
          helpHref: routeBuilder.help(),
        }}
        sections={PRIVACY_POLICY_FA}
      />
    </PageContainer>
  );
}

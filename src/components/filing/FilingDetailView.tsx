import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { routeBuilder } from '@/config/routes';
import { formatJalaaliFromParts, gregorianToJalaali } from '@/lib/format/jalali-calendar';
import type { FilingDetailSections } from '@/lib/filing/filing-detail-sections';
import type { FilingViewModel } from '@/lib/filing/filing-view-model';
import {
  FilingBrokerSidebar,
  FilingMaskanYabanCard,
} from './detail/FilingMaskanYabanCard';
import { FilingMobileActionBar } from './detail/FilingMobileActionBar';

function formatDateLabel(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return formatJalaaliFromParts(gregorianToJalaali(new Date(iso)), { withWeekday: true });
  } catch {
    return null;
  }
}

type Props = {
  filing: FilingViewModel;
  sections: FilingDetailSections;
};

export function FilingDetailView({ filing, sections }: Props) {
  const dateLabel = formatDateLabel(filing.postedAt ?? filing.createdAt);

  return (
    <div className="filing-detail-page">
      <nav className="filing-detail-breadcrumb" aria-label="مسیر صفحه">
        <Link href={routeBuilder.filingBrowse()}>فایلینگ</Link>
        <ChevronLeft className="size-3.5 opacity-50" aria-hidden />
        <span>جزئیات فایل</span>
      </nav>

      <div className="filing-detail-layout">
        <div className="filing-detail-main">
          <FilingMaskanYabanCard filing={filing} sections={sections} dateLabel={dateLabel} />
        </div>
        <FilingBrokerSidebar
          filing={filing}
          fileCode={filing.fileCode ?? filing.id.slice(-6)}
        />
      </div>

      <FilingMobileActionBar
        phone={filing.sourceMeta.brokerPhone}
        title={filing.title}
        fileCode={filing.fileCode ?? filing.id.slice(-6)}
      />
    </div>
  );
}

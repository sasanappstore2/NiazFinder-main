import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { FilingDetailView } from '@/components/filing/FilingDetailView';
import { loadFilingDetailById } from '@/lib/filing/load-filing-browse';

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await loadFilingDetailById(id);
  if (!detail) return { title: 'فایل یافت نشد' };
  return {
    title: detail.filing.title,
    description: detail.filing.description ?? detail.filing.location ?? undefined,
  };
}

export default async function FilingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await loadFilingDetailById(id);
  if (!detail) notFound();

  return (
    <PageContainer width="full" noVerticalPadding noHorizontalPadding>
      <FilingDetailView filing={detail.filing} sections={detail.sections} />
    </PageContainer>
  );
}

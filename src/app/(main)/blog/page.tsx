import Link from 'next/link';
import type { Metadata } from 'next';
import { PageContainer } from '@/components/layout/PageContainer';
import { db } from '@/lib/db';
import { SITE_NAME } from '@/lib/seo';
import { createSimpleMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = createSimpleMetadata(
  'وبلاگ',
  'مقالات و راهنماهای نیاز فایندر',
  '/blog'
);

export default async function BlogIndexPage() {
  const posts = await db.blogPost.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ publishedAt: 'desc' }],
    take: 24,
    select: { slug: true, title: true, excerpt: true, publishedAt: true },
  });

  return (
    <PageContainer>
      <h1 className="text-2xl font-bold">وبلاگ {SITE_NAME}</h1>
      <ul className="mt-8 space-y-4">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link href={`/blog/${p.slug}`} className="text-lg font-medium text-emerald-700 hover:underline">
              {p.title}
            </Link>
            {p.excerpt ? <p className="mt-1 text-sm text-muted-foreground">{p.excerpt}</p> : null}
          </li>
        ))}
        {posts.length === 0 && (
          <p className="text-muted-foreground">هنوز مقاله‌ای منتشر نشده است.</p>
        )}
      </ul>
    </PageContainer>
  );
}

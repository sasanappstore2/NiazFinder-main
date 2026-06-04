import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { db } from '@/lib/db';
import { createBrowseMetadata } from '@/lib/seo/metadata';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.blogPost.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: { title: true, seoDescription: true, excerpt: true },
  });
  if (!post) return { title: 'وبلاگ' };
  return createBrowseMetadata({
    title: post.title,
    description: post.seoDescription ?? post.excerpt ?? post.title,
    path: `/blog/${slug}`,
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await db.blogPost.findFirst({
    where: { slug, status: 'PUBLISHED' },
  });
  if (!post) notFound();

  return (
    <PageContainer width="narrow">
      <article>
        <h1 className="text-3xl font-bold">{post.title}</h1>
        {post.authorName ? (
          <p className="mt-2 text-sm text-muted-foreground">{post.authorName}</p>
        ) : null}
        <div
          className="prose prose-neutral mt-8 max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </PageContainer>
  );
}

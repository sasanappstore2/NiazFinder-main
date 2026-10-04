import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { embedModelId, embedPassagesBatch } from '@/lib/ai-agent/embedding-client';
import { pgvectorLiteral } from '@/lib/ai-agent/pgvector';
import { buildSiteKnowledgePack, getSiteHelpFaq } from '@/lib/ai-agent/knowledge/site-pack';
import { ROUTES } from '@/config/routes';
import { PRIVACY_POLICY_FA } from '@/content/legal/privacy-policy.fa';
import { TERMS_OF_SERVICE_FA } from '@/content/legal/terms-of-service.fa';
import type { LegalSection } from '@/content/legal/types';
import { db } from '@/lib/db';
import { chunkMarkdownDocument } from '@/lib/rag/chunking';
import { hashRagContent } from '@/lib/rag/content-hash';

export type KnowledgeSourceSpec = {
  sourceKey: string;
  sourcePath: string;
  title: string;
  route: string | null;
  load: () => string;
};

function repoRoot(): string {
  return process.cwd();
}

function readRepoFile(relativePath: string): string {
  const full = path.join(repoRoot(), relativePath);
  if (!existsSync(full)) return '';
  return readFileSync(full, 'utf8');
}

function formatLegalSections(sections: LegalSection[]): string {
  return sections
    .map((s) => {
      const parts = [`## ${s.title}`];
      if (s.paragraphs?.length) parts.push(s.paragraphs.join('\n'));
      if (s.bullets?.length) parts.push(s.bullets.map((b) => `- ${b}`).join('\n'));
      return parts.join('\n');
    })
    .join('\n\n');
}

/** Allowlisted public product knowledge only — never admin/docs/env secrets. */
export function listKnowledgeSources(): KnowledgeSourceSpec[] {
  const productAreas = [
    '02_Need_Intake.md',
    '03_Need_Marketplace.md',
    '04_Business_Marketplace.md',
    '05_Business_Profile.md',
    '06_Matching_Leads.md',
    '07_Communication_Chat.md',
    '08_Auth_Account.md',
    '11_Wallet_Payments.md',
    '13_Search_Discovery.md',
  ];

  const sources: KnowledgeSourceSpec[] = [
    {
      sourceKey: 'product-map',
      sourcePath: 'OBISIDIAN/00_Product_MOC/ProductMap.md',
      title: 'نقشه محصول نیازفایندر',
      route: '/',
      load: () => readRepoFile('OBISIDIAN/00_Product_MOC/ProductMap.md'),
    },
    {
      sourceKey: 'user-journeys',
      sourcePath: 'OBISIDIAN/00_Product_MOC/UserJourneys.md',
      title: 'سفرهای کاربری',
      route: ROUTES.needIntake,
      load: () => readRepoFile('OBISIDIAN/00_Product_MOC/UserJourneys.md'),
    },
    {
      sourceKey: 'site-pack',
      sourcePath: 'src/lib/ai-agent/knowledge/site-pack.ts',
      title: 'راهنمای فشرده محصول',
      route: ROUTES.help,
      load: () =>
        [
          buildSiteKnowledgePack(),
          getSiteHelpFaq('wallet').answer,
          getSiteHelpFaq('post').answer,
          getSiteHelpFaq('general').answer,
        ].join('\n\n'),
    },
    {
      sourceKey: 'routes-canonical',
      sourcePath: 'src/config/routes.ts',
      title: 'مسیرهای اصلی سایت',
      route: null,
      load: () =>
        [
          'مسیرهای canonical نیازفایندر:',
          `- ثبت نیاز: ${ROUTES.needIntake}`,
          '- بازار نیاز: /n/{city}',
          '- جزئیات نیاز: /v/{slug}/{id}',
          '- بازار کسب‌وکار: /b/{city}',
          '- پروفایل کسب‌وکار: /b/{slug}',
          `- چت: ${ROUTES.chat}`,
          `- داشبورد: ${ROUTES.dashboard}`,
          `- پشتیبانی: ${ROUTES.help}`,
          '- حریم خصوصی: /privacy',
          '- قوانین: /terms',
        ].join('\n'),
    },
    {
      sourceKey: 'privacy-policy',
      sourcePath: 'src/content/legal/privacy-policy.fa.ts',
      title: 'حریم خصوصی',
      route: '/privacy',
      load: () => formatLegalSections(PRIVACY_POLICY_FA),
    },
    {
      sourceKey: 'terms-of-service',
      sourcePath: 'src/content/legal/terms-of-service.fa.ts',
      title: 'قوانین و مقررات',
      route: '/terms',
      load: () => formatLegalSections(TERMS_OF_SERVICE_FA),
    },
    {
      sourceKey: 'help-page',
      sourcePath: 'src/app/(main)/help/page.tsx',
      title: 'پشتیبانی و راهنما',
      route: ROUTES.help,
      load: () =>
        [
          '# پشتیبانی و راهنما',
          'ثبت نیاز در /post: نیاز، توضیحات، دسته و مکان، پیش‌نمایش.',
          'بازار نیاز در /n/{city}: مرور نیازهای عمومی تأییدشده.',
          'بازار کسب‌وکار در /b/{city}: پیدا کردن فروشندگان فعال.',
          'چت و پیشنهاد پس از ثبت نیاز یا تماس با کسب‌وکار.',
          'کیف پول در داشبورد برای هزینه پیام دستیار و خرید لید کسب‌وکار.',
        ].join('\n'),
    },
  ];

  for (const file of productAreas) {
    const relative = `OBISIDIAN/10_Product_Areas/${file}`;
    sources.push({
      sourceKey: `product-area:${file.replace(/\.md$/, '')}`,
      sourcePath: relative,
      title: file.replace(/\.md$/, '').replace(/^\d+_/, '').replace(/_/g, ' '),
      route: null,
      load: () => readRepoFile(relative),
    });
  }

  return sources;
}

export async function indexSiteKnowledgeSource(sourceKey: string): Promise<{
  chunks: number;
  embedded: number;
}> {
  const source = listKnowledgeSources().find((s) => s.sourceKey === sourceKey);
  if (!source) return { chunks: 0, embedded: 0 };

  const raw = source.load().trim();
  if (!raw) {
    await db.siteKnowledgeChunk.deleteMany({ where: { sourceKey } });
    return { chunks: 0, embedded: 0 };
  }

  const drafts = chunkMarkdownDocument(raw, { fallbackTitle: source.title });
  const keepHashes = new Set<string>();
  let embedded = 0;

  const texts = drafts.map((d) => d.content);
  const vectors = await embedPassagesBatch(texts);
  const model = embedModelId();
  const now = new Date();

  for (let i = 0; i < drafts.length; i++) {
    const draft = drafts[i];
    const contentHash = hashRagContent(`${draft.title}\n${draft.content}`);
    keepHashes.add(`${contentHash}:${draft.chunkIndex}`);

    const existing = await db.siteKnowledgeChunk.findUnique({
      where: {
        sourceKey_contentHash_chunkIndex: {
          sourceKey,
          contentHash,
          chunkIndex: draft.chunkIndex,
        },
      },
      select: { id: true, embeddedAt: true },
    });

    let chunkId = existing?.id;
    if (!chunkId) {
      const created = await db.siteKnowledgeChunk.create({
        data: {
          sourceKey,
          sourcePath: source.sourcePath,
          section: draft.section,
          title: draft.title,
          content: draft.content,
          contentHash,
          chunkIndex: draft.chunkIndex,
          route: source.route,
          isPublic: true,
        },
        select: { id: true },
      });
      chunkId = created.id;
    }

    if (!existing?.embeddedAt) {
      const literal = pgvectorLiteral(vectors[i]);
      await db.$executeRawUnsafe(
        `UPDATE site_knowledge_chunks
         SET embedding = $1::vector,
             "embeddingModel" = $2,
             "embeddedAt" = $3,
             title = $4,
             content = $5,
             section = $6,
             route = $7,
             "sourcePath" = $8,
             "updatedAt" = $3
         WHERE id = $9`,
        literal,
        model,
        now,
        draft.title,
        draft.content,
        draft.section,
        source.route,
        source.sourcePath,
        chunkId,
      );
      embedded += 1;
    }
  }

  const stale = await db.siteKnowledgeChunk.findMany({
    where: { sourceKey },
    select: { id: true, contentHash: true, chunkIndex: true },
  });
  const staleIds = stale
    .filter((row) => !keepHashes.has(`${row.contentHash}:${row.chunkIndex}`))
    .map((row) => row.id);
  if (staleIds.length > 0) {
    await db.siteKnowledgeChunk.deleteMany({ where: { id: { in: staleIds } } });
  }

  return { chunks: drafts.length, embedded };
}

export async function indexAllSiteKnowledge(): Promise<{
  sources: number;
  chunks: number;
  embedded: number;
}> {
  let chunks = 0;
  let embedded = 0;
  const sources = listKnowledgeSources();
  for (const source of sources) {
    const result = await indexSiteKnowledgeSource(source.sourceKey);
    chunks += result.chunks;
    embedded += result.embedded;
  }
  return { sources: sources.length, chunks, embedded };
}

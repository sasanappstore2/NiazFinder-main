'use client';

import React, { useMemo } from 'react';
import { FileText } from 'lucide-react';
import type { Business } from '@/contracts/business-profile';
import {
  KNOWLEDGE_TYPE_LABELS,
  getKnowledgeState,
  publishedArticles,
} from '@/lib/business/ecosystem';

export default function KnowledgeHub({ business }: { business: Business }) {
  const articles = useMemo(
    () => publishedArticles(getKnowledgeState(business).articles),
    [business]
  );

  if (!articles.length) {
    return <p className="text-sm text-muted-foreground">هنوز محتوایی منتشر نشده است.</p>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {articles.slice(0, 6).map((a) => (
        <article key={a.id} className="rounded-xl border p-3">
          <div className="mb-1 flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
              {KNOWLEDGE_TYPE_LABELS[a.type]}
            </span>
          </div>
          <h4 className="text-sm font-semibold">{a.title}</h4>
          {a.excerpt && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.excerpt}</p>}
        </article>
      ))}
    </div>
  );
}

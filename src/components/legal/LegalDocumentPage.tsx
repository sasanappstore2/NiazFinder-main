import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import type { LegalDocumentMeta, LegalSection } from '@/content/legal/types';
import { isLegalEntityPending, LEGAL_ENTITY } from '@/content/legal/legal-entity';
import { cn } from '@/lib/utils';

export function LegalDocumentPage({
  meta,
  sections,
  showEntityPendingNotice = isLegalEntityPending(),
}: {
  meta: LegalDocumentMeta;
  sections: LegalSection[];
  showEntityPendingNotice?: boolean;
}) {
  return (
    <article className="pb-16">
      <header className="mb-8 space-y-3">
        <h2 className="text-h3 font-bold tracking-tight">{meta.title}</h2>
        <p className="text-sm text-muted-foreground">
          آخرین به‌روزرسانی: {meta.effectiveDate} · نسخه {meta.version}
        </p>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{meta.description}</p>
      </header>

      {showEntityPendingNotice && (
        <div
          role="note"
          className="mb-8 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:text-amber-100"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div className="space-y-1">
            <p className="font-medium">اطلاعات حقوقی شرکت در حال تکمیل است</p>
            <p className="text-amber-900/80 dark:text-amber-100/80">
              نام رسمی، شماره ثبت و آدرس قانونی به‌زودی در این صفحه درج می‌شود. این متن جایگزین
              مشاوره حقوقی نیست.
            </p>
          </div>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:gap-10 lg:items-start">
        <nav
          aria-label="فهرست مطالب"
          className="mb-8 lg:sticky lg:top-[calc(var(--site-header-offset,5rem)+1rem)] lg:mb-0"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            فهرست
          </p>
          <ul className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-1">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#section-${section.id}`}
                  className={cn(
                    'inline-block rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground',
                    'transition-colors hover:bg-accent hover:text-foreground'
                  )}
                >
                  {section.title.replace(/^\d+\.\s*/, '')}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-10">
          {sections.map((section) => (
            <section
              key={section.id}
              id={`section-${section.id}`}
              className="scroll-mt-24 space-y-3 border-b border-border/40 pb-8 last:border-0"
            >
              <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
              {section.paragraphs?.map((p, i) => (
                <p key={i} className="text-sm leading-7 text-muted-foreground">
                  {p}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="list-disc space-y-2 ps-5 text-sm leading-7 text-muted-foreground marker:text-primary/70">
                  {section.bullets.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
              {section.id === 'contact' && (
                <dl className="mt-4 grid gap-2 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
                  <div className="grid gap-0.5 sm:grid-cols-[6rem_1fr]">
                    <dt className="font-medium text-foreground">نام رسمی</dt>
                    <dd className="text-muted-foreground">{LEGAL_ENTITY.legalName}</dd>
                  </div>
                  <div className="grid gap-0.5 sm:grid-cols-[6rem_1fr]">
                    <dt className="font-medium text-foreground">شناسه / ثبت</dt>
                    <dd className="text-muted-foreground">{LEGAL_ENTITY.registrationId}</dd>
                  </div>
                  <div className="grid gap-0.5 sm:grid-cols-[6rem_1fr]">
                    <dt className="font-medium text-foreground">آدرس</dt>
                    <dd className="text-muted-foreground">{LEGAL_ENTITY.address}</dd>
                  </div>
                  <div className="grid gap-0.5 sm:grid-cols-[6rem_1fr]">
                    <dt className="font-medium text-foreground">ایمیل</dt>
                    <dd>
                      <a
                        href={`mailto:${LEGAL_ENTITY.email}`}
                        className="text-primary hover:underline"
                      >
                        {LEGAL_ENTITY.email}
                      </a>
                    </dd>
                  </div>
                  <div className="grid gap-0.5 sm:grid-cols-[6rem_1fr]">
                    <dt className="font-medium text-foreground">تلفن</dt>
                    <dd className="text-muted-foreground" dir="ltr">
                      {LEGAL_ENTITY.phone}
                    </dd>
                  </div>
                </dl>
              )}
              {section.id === 'privacy' && meta.privacyHref && (
                <p className="text-sm">
                  <Link href={meta.privacyHref} className="font-medium text-primary hover:underline">
                    مطالعه سیاست حریم خصوصی
                  </Link>
                </p>
              )}
            </section>
          ))}

          <footer className="rounded-xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
            <p className="leading-relaxed">
              با استفاده از {LEGAL_ENTITY.brandName}، این قوانین را می‌پذیرید. برای پشتیبانی عمومی
              {meta.helpHref ? (
                <>
                  {' '}
                  به{' '}
                  <Link href={meta.helpHref} className="text-primary hover:underline">
                    صفحه راهنما
                  </Link>{' '}
                  مراجعه کنید.
                </>
              ) : (
                ' با پشتیبانی تماس بگیرید.'
              )}
            </p>
          </footer>
        </div>
      </div>
    </article>
  );
}

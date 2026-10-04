import Link from 'next/link';
import { SITE_URL } from '@/lib/constants';

export default function EnHomePage() {
  return (
    <main dir="ltr" className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">NeedFinder</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Connect needs with trusted businesses across Iran. Browse listings, post a need, or
        explore business profiles — primarily in Persian; this page is a minimal English entry.
      </p>
      <ul className="mt-8 flex flex-col gap-3 text-sm">
        <li>
          <Link href="/n/iran" className="text-emerald-700 underline">
            Browse needs (Iran)
          </Link>
        </li>
        <li>
          <Link href="/b/iran" className="text-emerald-700 underline">
            Browse businesses (Persian UI)
          </Link>
        </li>
        <li>
          <a href={SITE_URL} className="text-emerald-700 underline">
            Persian homepage
          </a>
        </li>
      </ul>
    </main>
  );
}

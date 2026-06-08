import type { Metadata } from 'next';
import { MashhadDivarTestMap } from '@/components/map/mashhad/MashhadDivarTestMap';

export const metadata: Metadata = {
  title: '\u0646\u0642\u0634\u0647 \u062a\u0633\u062a \u0645\u0634\u0647\u062f | NiazFinder',
  robots: { index: false, follow: false },
};

export default function MashhadMapDevPage() {
  return (
    <div className="flex h-[calc(100dvh-var(--site-header-offset,4rem))] min-h-[480px] flex-col">
      <div className="shrink-0 border-b border-border/60 bg-card/80 px-4 py-2 text-center text-sm text-muted-foreground">
        {'\u067e\u06cc\u0634\u200c\u0646\u0645\u0627\u06cc\u0634 dev \u2014 \u0647\u0645\u0627\u0646 \u0646\u0642\u0634\u0647\u0654 production \u062f\u0631 browse \u0645\u0634\u0647\u062f (\u0632\u0648\u0645 \u062a\u0627 \u06f1\u06f6)'}
      </div>
      <div className="min-h-0 flex-1">
        <MashhadDivarTestMap className="h-full" />
      </div>
    </div>
  );
}

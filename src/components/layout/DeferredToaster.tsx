'use client';

import dynamic from 'next/dynamic';

const Toaster = dynamic(
  () => import('sonner').then((m) => m.Toaster),
  { ssr: false }
);

export function DeferredToaster() {
  return <Toaster position="top-center" richColors dir="rtl" closeButton />;
}

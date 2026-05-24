import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';

/**
 * Server-component layout that wraps every `(main)` page with the client-side
 * AppShell. Keeping this file as a server component is essential so that
 * server-side `redirect()` / `notFound()` thrown from child server pages
 * can be caught by Next.js's framework boundaries before any client tree
 * mounts. Once a layout is `'use client'`, server-side navigation control
 * flow can be silently swallowed in dev (Turbopack RSC).
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

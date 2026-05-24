'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ROUTE_METADATA } from '@/lib/route-config';

const SITE_NAME = 'نیاز فایندر';

const PATH_VIEW_MAP: Record<string, string> = {
  '/': 'home',
  '/browse': 'browse',
  '/post': 'post-need',
  '/dashboard': 'dashboard',
  '/chat': 'messages',
  '/notifications': 'notifications',
  '/login': 'login',
  '/register': 'register',
};

export function usePageMetadata(): void {
  const pathname = usePathname();

  useEffect(() => {
    let viewKey: string | undefined = PATH_VIEW_MAP[pathname];
    if (!viewKey && pathname.startsWith('/browse/')) viewKey = 'browse';
    if (!viewKey && (pathname.startsWith('/v/') || pathname.startsWith('/n/'))) viewKey = 'request-detail';
    if (!viewKey && (pathname.startsWith('/pro/') || pathname.startsWith('/b/'))) viewKey = 'specialist-profile';

    const metadata = (viewKey && ROUTE_METADATA[viewKey]) || ROUTE_METADATA.home;
    if (!metadata) return;

    document.title = `${metadata.title} | ${SITE_NAME}`;
    setMetaTag('description', metadata.description);
  }, [pathname]);
}

function setMetaTag(name: string, content: string): void {
  if (typeof document === 'undefined') return;
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (meta) {
    meta.setAttribute('content', content);
  } else {
    meta = document.createElement('meta');
    meta.name = name;
    meta.content = content;
    document.head.appendChild(meta);
  }
}

'use client';

import { usePathname } from 'next/navigation';
import { isBusinessProductDetailPath } from '@/config/routes';
import { cn } from '@/lib/utils';

/** موقعیت شناور بج تماس — بالای ناوبری موبایل در صفحات معمولی */
export function useVoiceCallFloatWrapClass() {
  const pathname = usePathname();
  const isChat = pathname.startsWith('/chat');
  const isSuperAdmin = pathname.startsWith('/super-admin');
  const isProductDetail = isBusinessProductDetailPath(pathname);
  const aboveMobileNav = !isChat && !isSuperAdmin && !isProductDetail;

  return cn(
    'voice-call-float-wrap pointer-events-none fixed inset-x-3 flex justify-center sm:inset-x-4',
    aboveMobileNav && 'voice-call-float-wrap--above-mobile-nav',
    isChat && 'voice-call-float-wrap--above-composer'
  );
}

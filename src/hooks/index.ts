/**
 * هوک‌های سفارشی - صادرات یکپارچه
 * تمام هوک‌های سفارشی پروژه از این فایل صادر می‌شوند
 */

// هوک‌های موجود
export { useIsMobile } from './use-mobile';
export { useToast } from './use-toast';

// هوک‌های جدید
export { usePageMetadata } from './use-seo';
export { useRouteGuard, useViewGuard } from './use-RouteGuard';
export { useChatUrl } from './use-chat-url';
export { useOptimizedFetch, invalidateCache, prefetch } from './use-optimized-fetch';
export type { OptimizedFetchOptions, OptimizedFetchResult } from './use-optimized-fetch';

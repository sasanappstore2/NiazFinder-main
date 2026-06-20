import { cn } from '@/lib/utils';
import type { CSSProperties, ReactNode } from 'react';

export type PageContainerWidth =
  | 'default'
  | 'narrow'
  | 'medium'
  | 'content'
  /** Need intake: readable on phone, comfortable multi-column on desktop */
  | 'intake'
  | 'wide'
  | 'full';

const WIDTH_CLASS: Record<PageContainerWidth, string> = {
  default: 'max-w-[min(100%,var(--page-max-width,80rem))]',
  narrow: 'max-w-[min(100%,var(--content-readable,38.2rem))]',
  medium: 'max-w-[min(100%,42rem)]',
  content: 'max-w-[min(100%,48rem)]',
  intake: cn(
    'max-w-[min(100%,var(--content-readable,38.2rem))]',
    'sm:max-w-[min(100%,42rem)]',
    'lg:max-w-[min(100%,var(--content-comfort,61.8rem))]',
    'xl:max-w-[min(100%,68rem)]'
  ),
  wide: 'max-w-[min(100%,84rem)]',
  full: 'max-w-full',
};

/** Shared horizontal padding (CSS: `.page-padding` in responsive-golden.css). */
export const PAGE_PADDING_CLASS = 'page-padding';

/** Reusable max-width + padding for header/footer alignment. */
export const PAGE_CONTAINER_CLASS = cn(
  'page-container mx-auto w-full max-w-7xl'
);

export interface PageContainerProps {
  children: ReactNode;
  width?: PageContainerWidth;
  className?: string;
  style?: CSSProperties;
  /** Omit default pt-2 pb-12 (e.g. breadcrumb-only shell on browse pages). */
  noVerticalPadding?: boolean;
  /** Omit horizontal padding (parent provides it). */
  noHorizontalPadding?: boolean;
  as?: 'div' | 'section' | 'main';
}

export function PageContainer({
  children,
  width = 'default',
  className,
  style,
  noVerticalPadding = false,
  noHorizontalPadding = false,
  as: Tag = 'div',
}: PageContainerProps) {
  return (
    <Tag
      style={style}
      className={cn(
        'mx-auto w-full min-w-0 overflow-x-clip',
        WIDTH_CLASS[width],
        !noHorizontalPadding && PAGE_PADDING_CLASS,
        !noVerticalPadding && 'pt-2 pb-12 sm:pt-4',
        className
      )}
    >
      {children}
    </Tag>
  );
}

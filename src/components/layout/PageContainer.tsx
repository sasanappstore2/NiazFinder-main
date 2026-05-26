import { cn } from '@/lib/utils';
import type { CSSProperties, ReactNode } from 'react';

export type PageContainerWidth =
  | 'default'
  | 'narrow'
  | 'medium'
  | 'content'
  | 'wide'
  | 'full';

const WIDTH_CLASS: Record<PageContainerWidth, string> = {
  default: 'max-w-7xl',
  narrow: 'max-w-2xl',
  medium: 'max-w-3xl',
  content: 'max-w-4xl',
  wide: 'max-w-6xl',
  full: 'max-w-full',
};

/** Shared horizontal padding for page content (matches `.page-container` in globals). */
export const PAGE_PADDING_CLASS = 'px-4 sm:px-6 lg:px-8';

/** Reusable max-width + padding for header/footer alignment. */
export const PAGE_CONTAINER_CLASS = cn(
  'mx-auto w-full max-w-7xl',
  PAGE_PADDING_CLASS
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
        'mx-auto w-full',
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

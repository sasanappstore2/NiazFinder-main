'use client';

import React, { type ReactNode } from 'react';

interface StreamSectionProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  /** Minimum height to prevent layout shift (CSS value) */
  minHeight?: string;
  /** Unique identifier for this section */
  id?: string;
}

/**
 * Section-level streaming wrapper with layout shift prevention
 * and fade-in animation when content loads.
 */
export function StreamSection({
  children,
  fallback,
  className,
  minHeight = '200px',
  id,
}: StreamSectionProps) {
  return (
    <React.Suspense
      fallback={
        fallback ?? (
          <div
            id={id}
            className={`flex items-center justify-center animate-pulse ${className ?? ''}`}
            style={{ minHeight }}
          >
            <div className="w-full h-full animate-shimmer-loading rounded-xl" />
          </div>
        )
      }
    >
      <div id={id} className={className}>
        <FadeInWrapper>{children}</FadeInWrapper>
      </div>
    </React.Suspense>
  );
}

/** Wraps content with a fade-in animation */
function FadeInWrapper({ children }: { children: ReactNode }) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    // Trigger animation on next frame
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className={`transition-all duration-500 ease-out ${
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2'
      }`}
    >
      {children}
    </div>
  );
}

/**
 * Error boundary for streaming sections.
 */
interface StreamErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface StreamErrorBoundaryState {
  hasError: boolean;
}

export class StreamErrorBoundary extends React.Component<
  StreamErrorBoundaryProps,
  StreamErrorBoundaryState
> {
  constructor(props: StreamErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): StreamErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[StreamSection] Error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-3">
              <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <svg
                  className="size-6 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                خطا در بارگذاری بخش
              </p>
              <button
                className="text-sm text-primary hover:underline"
                onClick={() => this.setState({ hasError: false })}
              >
                تلاش مجدد
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

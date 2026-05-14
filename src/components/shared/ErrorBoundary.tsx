'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

// ─── Props ───────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDevDetails: boolean;
}

// ─── ErrorBoundary Class Component ───────────────────────────────────────────

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDevDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDevDetails: false,
    });
  };

  private handleGoHome = () => {
    const store = useAppStore.getState();
    store.navigateTo('home');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDevDetails: false,
    });
  };

  private toggleDevDetails = () => {
    this.setState((prev) => ({ showDevDetails: !prev.showDevDetails }));
  };

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, render it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = process.env.NODE_ENV === 'development';
      const { error, errorInfo, showDevDetails } = this.state;

      return (
        <div dir="rtl" className="min-h-screen flex items-center justify-center p-4 bg-background">
          <AnimatePresence mode="wait">
            <motion.div
              key="error-boundary"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="w-full max-w-lg"
            >
              <Card className="border-0 shadow-xl overflow-hidden">
                {/* Emerald accent top bar */}
                <div className="h-1.5 bg-gradient-to-l from-emerald-400 via-emerald-500 to-emerald-600" />

                <CardContent className="p-8 md:p-10">
                  {/* Illustration */}
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      {/* Glow ring behind icon */}
                      <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl scale-150" />
                      <div className="relative bg-emerald-50 dark:bg-emerald-950/40 p-6 rounded-full">
                        <AlertTriangle className="w-16 h-16 text-emerald-500" strokeWidth={1.5} />
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl font-bold text-center text-foreground mb-3">
                    خطایی رخ داد!
                  </h1>

                  {/* Description */}
                  <p className="text-center text-muted-foreground leading-relaxed mb-8 text-sm md:text-base">
                    متأسفانه در پردازش این صفحه خطایی رخ داده است. لطفاً دوباره تلاش کنید.
                  </p>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={this.handleRetry}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 min-w-[140px]"
                    >
                      <RefreshCw className="w-4 h-4" />
                      تلاش مجدد
                    </Button>
                    <Button
                      variant="outline"
                      onClick={this.handleGoHome}
                      className="gap-2 min-w-[140px] border-muted-foreground/25"
                    >
                      <Home className="w-4 h-4" />
                      بازگشت به صفحه اصلی
                    </Button>
                  </div>

                  {/* Development info — only shown in dev mode */}
                  {isDev && error && (
                    <div className="mt-8">
                      <button
                        onClick={this.toggleDevDetails}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
                      >
                        <span>اطلاعات خطای توسعه‌دهنده</span>
                        <span className={`transition-transform duration-200 ${showDevDetails ? 'rotate-180' : ''}`}>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </span>
                      </button>

                      {showDevDetails && (
                        <div className="mt-3 p-4 bg-muted/60 rounded-lg border border-border text-left" dir="ltr">
                          <p className="text-xs font-semibold text-red-500 dark:text-red-400 mb-2 font-mono break-words">
                            {error.name}: {error.message}
                          </p>
                          {errorInfo?.componentStack && (
                            <pre className="text-[11px] text-muted-foreground font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto leading-relaxed">
                              {errorInfo.componentStack}
                            </pre>
                          )}
                          {error.stack && (
                            <pre className="text-[11px] text-muted-foreground font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto mt-2 leading-relaxed">
                              {error.stack}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── withErrorBoundary HOC ───────────────────────────────────────────────────

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;

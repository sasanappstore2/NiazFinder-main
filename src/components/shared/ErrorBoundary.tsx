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
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full max-w-lg"
            >
              <Card className="border-0 shadow-xl overflow-hidden">
                {/* Emerald accent top bar */}
                <div className="h-1.5 bg-gradient-to-l from-emerald-400 via-emerald-500 to-emerald-600" />

                <CardContent className="p-8 md:p-10">
                  {/* Illustration */}
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 200 }}
                    className="flex justify-center mb-6"
                  >
                    <div className="relative">
                      {/* Glow ring behind icon */}
                      <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl scale-150" />
                      <div className="relative bg-emerald-50 dark:bg-emerald-950/40 p-6 rounded-full">
                        <AlertTriangle className="w-16 h-16 text-emerald-500" strokeWidth={1.5} />
                      </div>
                    </div>
                  </motion.div>

                  {/* Title */}
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.4 }}
                    className="text-2xl font-bold text-center text-foreground mb-3"
                  >
                    خطایی رخ داد!
                  </motion.h1>

                  {/* Description */}
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.4 }}
                    className="text-center text-muted-foreground leading-relaxed mb-8 text-sm md:text-base"
                  >
                    متأسفانه در پردازش این صفحه خطایی رخ داده است. لطفاً دوباره تلاش کنید.
                  </motion.p>

                  {/* Action buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55, duration: 0.4 }}
                    className="flex flex-col sm:flex-row gap-3 justify-center"
                  >
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
                  </motion.div>

                  {/* Development info — only shown in dev mode */}
                  {isDev && error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ delay: 0.7, duration: 0.4 }}
                      className="mt-8"
                    >
                      <button
                        onClick={this.toggleDevDetails}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
                      >
                        <span>اطلاعات خطای توسعه‌دهنده</span>
                        <motion.span
                          animate={{ rotate: showDevDetails ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </motion.span>
                      </button>

                      <AnimatePresence>
                        {showDevDetails && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
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
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
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

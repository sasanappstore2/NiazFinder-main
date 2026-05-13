'use client';

import { useEffect, Suspense, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { usePageMetadata } from '@/hooks/use-seo';
import { useViewGuard } from '@/hooks/use-RouteGuard';
import { getRouteGroup, ROUTE_PERMISSIONS } from '@/lib/route-config';

// ============================
// Layout Components
// ============================
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { AuthModal } from '@/components/auth/AuthModal';
import { BackToTop } from '@/components/shared/BackToTop';
import { QuickActions } from '@/components/shared/QuickActions';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { CookieConsent } from '@/components/shared/CookieConsent';
import { OnboardingWelcome } from '@/components/shared/OnboardingWelcome';
import { Separator } from '@/components/ui/separator';

// ============================
// Skeleton Imports (Streaming)
// ============================
import {
  HomePageSkeleton,
  RequestListSkeleton,
  SpecialistListSkeleton,
  DashboardSkeleton,
  ChatSkeleton,
  ProfileSkeleton,
} from '@/components/skeletons';

// ============================
// Page Components
// ============================
import { HeroSection } from '@/components/home/HeroSection';
import TrustPartnersMarquee from '@/components/home/TrustPartnersMarquee';
import { CategoriesSection } from '@/components/home/CategoriesSection';
import { HowItWorks } from '@/components/home/HowItWorks';
import { TopSpecialists } from '@/components/home/TopSpecialists';
import { FeaturedRequests } from '@/components/home/FeaturedRequests';
import { ActivityFeed } from '@/components/home/ActivityFeed';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { FAQSection } from '@/components/home/FAQSection';
import { StatsCounter } from '@/components/home/StatsCounter';
import { PricingSection } from '@/components/home/PricingSection';
import { CTABanner } from '@/components/home/CTABanner';
import { RequestForm } from '@/components/requests/RequestForm';
import { BrowseRequests } from '@/components/requests/BrowseRequests';
import { RequestDetail } from '@/components/requests/RequestDetail';
import { ProposalForm } from '@/components/requests/ProposalForm';
import ReviewForm from '@/components/specialists/ReviewForm';
import { BrowseSpecialists } from '@/components/specialists/BrowseSpecialists';
import { SpecialistProfile } from '@/components/specialists/SpecialistProfile';
import { CompareSpecialists } from '@/components/specialists/CompareSpecialists';
import { UserDashboard } from '@/components/dashboard/UserDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { ReferralPage } from '@/components/dashboard/ReferralPage';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { NotificationsPanel } from '@/components/chat/NotificationsPanel';
import { NotificationSettings } from '@/components/dashboard/NotificationSettings';

// ============================
// Animation Config
// ============================
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -12 },
};

const pageTransition = {
  type: 'tween' as const,
  ease: 'easeInOut' as const,
  duration: 0.25,
};

// ============================
// Page Wrapper with Suspense
// ============================
function PageWrapper({
  children,
  skeleton,
}: {
  children: React.ReactNode;
  skeleton: React.ReactNode;
}) {
  return (
    <Suspense fallback={skeleton}>
      {children}
    </Suspense>
  );
}

// ============================
// Content Layout per Route Group
// ============================
function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-2 pb-12">
      <Breadcrumb />
      <Separator className="my-4" />
      {children}
    </div>
  );
}

function DashboardLayout({ children, maxW = '7xl' }: { children: React.ReactNode; maxW?: string }) {
  return (
    <div className={`max-w-${maxW} mx-auto px-4 pt-2 pb-12`}>
      <Breadcrumb />
      <Separator className="my-4" />
      {children}
    </div>
  );
}

function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-2 pb-12" style={{ height: 'calc(100vh - 80px)' }}>
      <Breadcrumb />
      <Separator className="my-4" />
      {children}
    </div>
  );
}

// ============================
// Suspense-wrapped HomePage with Streaming
// ============================
function HomePage() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <main>
        {/* Hero - streams first (above fold) */}
        <Suspense fallback={
          <section className="relative hero-gradient pattern-overlay overflow-hidden">
            <div className="mx-auto max-w-7xl px-4 py-20 sm:py-28 text-center">
              <div className="h-7 w-40 rounded-full bg-primary/10 animate-pulse mx-auto mb-4" />
              <div className="h-10 sm:h-12 w-72 sm:w-96 rounded-lg bg-muted animate-pulse mx-auto mb-6" />
              <div className="h-5 sm:h-6 w-80 sm:w-[28rem] rounded bg-muted animate-pulse mx-auto mb-8" />
            </div>
          </section>
        }>
          <HeroSection />
        </Suspense>

        <TrustPartnersMarquee />

        {/* Stats - streams second */}
        <Suspense fallback={
          <section className="py-12 border-y border-border/50 bg-card/30">
            <div className="mx-auto max-w-7xl px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="h-10 w-24 rounded-md bg-muted animate-pulse" />
                    <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        }>
          <StatsCounter />
        </Suspense>

        {/* Categories - streams third */}
        <Suspense fallback={
          <section className="py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 space-y-8">
              <div className="text-center">
                <div className="h-7 w-48 rounded-md bg-muted animate-pulse mx-auto mb-3" />
                <div className="h-4 w-72 rounded bg-muted animate-pulse mx-auto" />
              </div>
            </div>
          </section>
        }>
          <CategoriesSection />
        </Suspense>

        {/* How it Works */}
        <Suspense fallback={
          <section className="py-16 sm:py-20 bg-muted/20">
            <div className="mx-auto max-w-7xl px-4 text-center">
              <div className="h-7 w-48 rounded-md bg-muted animate-pulse mx-auto mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-xl p-6">
                    <div className="size-12 rounded-full bg-primary/10 animate-pulse mx-auto mb-4" />
                    <div className="h-5 w-28 rounded-md bg-muted animate-pulse mx-auto mb-3" />
                    <div className="h-3.5 w-full rounded bg-muted animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        }>
          <HowItWorks />
        </Suspense>

        {/* Top Specialists */}
        <Suspense fallback={<div className="py-16 sm:py-20"><div className="max-w-7xl mx-auto px-4"><RequestListSkeleton count={3} /></div></div>}>
          <TopSpecialists />
        </Suspense>

        {/* Featured Requests */}
        <Suspense fallback={<div className="py-16 sm:py-20"><div className="max-w-7xl mx-auto px-4"><RequestListSkeleton count={3} /></div></div>}>
          <FeaturedRequests />
        </Suspense>

        {/* Activity Feed */}
        <Suspense fallback={<div className="py-12"><div className="max-w-7xl mx-auto px-4"><div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />)}</div></div></div>}>
          <ActivityFeed />
        </Suspense>

        {/* Pricing */}
        <Suspense fallback={
          <section className="py-16 sm:py-20 bg-muted/20">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <div className="h-7 w-48 rounded-md bg-muted animate-pulse mx-auto mb-8" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-xl p-6 h-80" />
                ))}
              </div>
            </div>
          </section>
        }>
          <PricingSection />
        </Suspense>

        {/* CTA Banner */}
        <Suspense fallback={
          <section className="py-20 relative overflow-hidden hero-gradient pattern-overlay">
            <div className="max-w-3xl mx-auto px-4 text-center">
              <div className="h-8 w-72 rounded-lg bg-muted animate-pulse mx-auto mb-6" />
              <div className="h-5 w-96 rounded bg-muted animate-pulse mx-auto mb-8" />
            </div>
          </section>
        }>
          <CTABanner />
        </Suspense>

        {/* Testimonials */}
        <Suspense fallback={
          <section className="py-16 sm:py-20">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <div className="h-7 w-48 rounded-md bg-muted animate-pulse mx-auto mb-8" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-xl p-6 h-48" />
                ))}
              </div>
            </div>
          </section>
        }>
          <TestimonialsSection />
        </Suspense>

        {/* FAQ */}
        <Suspense fallback={
          <section className="py-16 sm:py-20 bg-muted/20">
            <div className="max-w-3xl mx-auto px-4">
              <div className="h-7 w-48 rounded-md bg-muted animate-pulse mx-auto mb-8" />
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />
                ))}
              </div>
            </div>
          </section>
        }>
          <FAQSection />
        </Suspense>
      </main>
    </Suspense>
  );
}

// ============================
// Route Group Classifier
// ============================
type RouteGroup = 'home' | 'auth' | 'marketplace' | 'dashboard' | 'chat' | 'admin' | 'other';

function classifyRoute(view: string): RouteGroup {
  if (view === 'home') return 'home';
  if (view === 'login' || view === 'register') return 'auth';
  if (view === 'admin') return 'admin';
  if (view === 'messages') return 'chat';
  const group = getRouteGroup(view);
  if (group === 'marketplace') return 'marketplace';
  if (group === 'dashboard') return 'dashboard';
  return 'other';
}

// ============================
// Main App Controller
// ============================
export default function App() {
  const { currentView, isAuthenticated, currentUser } = useAppStore();

  // SEO: Auto-update page title/meta based on current view
  usePageMetadata(currentView);

  // Route guard for protected routes
  const isRouteProtected = (ROUTE_PERMISSIONS[currentView] || []).length > 0;
  const guardResult = useViewGuard(currentView);
  const isDenied = isRouteProtected && !guardResult.isAllowed && !isAuthenticated;

  // Keyboard shortcut: Escape to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useAppStore.getState().goBack();
      }
      // Ctrl+K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        useAppStore.getState().setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // URL hash deep-linking support
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash) return;

      const { parseHash } = useAppStore.getState();
      try {
        const { view, params } = parseHash(hash);
        if (view && view !== currentView) {
          useAppStore.getState().navigateTo(view, params);
        }
      } catch {
        // Invalid hash, ignore
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentView]);

  const isHome = currentView === 'home';
  const routeGroup = classifyRoute(currentView);

  // Determine footer visibility per route group
  const showFullFooter = isHome;
  const showCompactFooter = !isHome && routeGroup !== 'auth' && routeGroup !== 'chat' && routeGroup !== 'admin';

  // Memoize content rendering based on current view
  const renderContent = useCallback(() => {
    switch (currentView) {
      // Auth views — handled by AuthModal overlay
      case 'login':
      case 'register':
        return null;

      // Home
      case 'home':
        return <HomePage />;

      // Marketplace routes
      case 'post-need':
        return (
          <PageWrapper skeleton={<RequestListSkeleton count={1} />}>
            <MarketplaceLayout>
              <RequestForm />
            </MarketplaceLayout>
          </PageWrapper>
        );

      case 'browse-requests':
        return (
          <PageWrapper skeleton={<RequestListSkeleton />}>
            <MarketplaceLayout>
              <BrowseRequests />
            </MarketplaceLayout>
          </PageWrapper>
        );

      case 'request-detail':
        return (
          <PageWrapper skeleton={<RequestListSkeleton count={1} />}>
            <DashboardLayout maxW="5xl">
              <RequestDetail />
            </DashboardLayout>
          </PageWrapper>
        );

      case 'submit-proposal':
        return (
          <PageWrapper skeleton={<RequestListSkeleton count={1} />}>
            <DashboardLayout maxW="3xl">
              <ProposalForm />
            </DashboardLayout>
          </PageWrapper>
        );

      // Specialist routes
      case 'browse-specialists':
        return (
          <PageWrapper skeleton={<SpecialistListSkeleton />}>
            <MarketplaceLayout>
              <BrowseSpecialists />
            </MarketplaceLayout>
          </PageWrapper>
        );

      case 'specialist-profile':
        return (
          <PageWrapper skeleton={<ProfileSkeleton />}>
            <DashboardLayout maxW="6xl">
              <SpecialistProfile />
            </DashboardLayout>
          </PageWrapper>
        );

      case 'compare-specialists':
        return (
          <PageWrapper skeleton={<SpecialistListSkeleton count={3} />}>
            <MarketplaceLayout>
              <CompareSpecialists />
            </MarketplaceLayout>
          </PageWrapper>
        );

      case 'submit-review':
        return (
          <PageWrapper skeleton={<ProfileSkeleton />}>
            <DashboardLayout maxW="4xl">
              <ReviewForm />
            </DashboardLayout>
          </PageWrapper>
        );

      // Dashboard routes
      case 'dashboard':
        return (
          <PageWrapper skeleton={<DashboardSkeleton />}>
            <DashboardLayout>
              <UserDashboard />
            </DashboardLayout>
          </PageWrapper>
        );

      case 'profile':
        return (
          <PageWrapper skeleton={<ProfileSkeleton />}>
            <DashboardLayout maxW="5xl">
              <UserDashboard />
            </DashboardLayout>
          </PageWrapper>
        );

      case 'referral':
        return (
          <PageWrapper skeleton={<DashboardSkeleton />}>
            <DashboardLayout maxW="4xl">
              <ReferralPage />
            </DashboardLayout>
          </PageWrapper>
        );

      case 'notification-settings':
        return (
          <PageWrapper skeleton={<DashboardSkeleton />}>
            <DashboardLayout maxW="3xl">
              <NotificationSettings />
            </DashboardLayout>
          </PageWrapper>
        );

      case 'pricing':
        return (
          <PageWrapper skeleton={<DashboardSkeleton />}>
            <DashboardLayout maxW="6xl">
              <PricingSection />
            </DashboardLayout>
          </PageWrapper>
        );

      // Chat routes
      case 'messages':
        return (
          <PageWrapper skeleton={<ChatSkeleton />}>
            <ChatLayout>
              <ChatPanel />
            </ChatLayout>
          </PageWrapper>
        );

      // Notification routes
      case 'notifications':
        return (
          <PageWrapper skeleton={<DashboardSkeleton />}>
            <DashboardLayout maxW="3xl">
              <NotificationsPanel />
            </DashboardLayout>
          </PageWrapper>
        );

      // Admin routes
      case 'admin':
        return (
          <PageWrapper skeleton={<DashboardSkeleton />}>
            <ErrorBoundary>
              <AdminDashboard />
            </ErrorBoundary>
          </PageWrapper>
        );

      default:
        return null;
    }
  }, [currentView]);

  // Determine if header should be hidden (auth pages)
  const hideHeader = routeGroup === 'auth';

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        {/* Header — hidden for auth pages */}
        {!hideHeader && <Header />}

        {/* Route Guard: Show access denied if needed */}
        {isDenied ? (
          <div className="flex-1 flex items-center justify-center" dir="rtl">
            <div className="glass-card rounded-2xl p-8 max-w-md text-center space-y-4">
              <div className="text-4xl">🔒</div>
              <h2 className="text-xl font-bold">دسترسی محدود</h2>
              <p className="text-muted-foreground">
                برای دسترسی به این بخش ابتدا وارد حساب کاربری خود شوید.
              </p>
              <button
                onClick={() => useAppStore.getState().setAuthModalOpen(true)}
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium hover:opacity-90 transition"
              >
                ورود به حساب
              </button>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.main
              key={currentView}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className={`flex-1 ${isHome ? '' : 'pt-6'}`}
              dir="rtl"
            >
              {renderContent()}
            </motion.main>
          </AnimatePresence>
        )}

        {/* Footer — contextual per route group */}
        {showFullFooter && <Footer />}
        {showCompactFooter && (
          <div className="mt-auto">
            <Separator />
            <Footer compact />
          </div>
        )}

        {/* Global Overlays */}
        <AuthModal />
        <OnboardingWelcome />
        <MobileBottomNav />
        <CookieConsent />
        <BackToTop />
        <QuickActions />
      </div>
    </ErrorBoundary>
  );
}

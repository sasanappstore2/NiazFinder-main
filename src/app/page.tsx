'use client';

import { useEffect, useCallback, lazy, Suspense, ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';

// Core Layout Components - kept static (small footprint)
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

// Lazy loaded view components - only loaded when needed
const HomePage = lazy(() => import('@/components/views/HomePage'));
const RequestFormPage = lazy(() => import('@/components/views/RequestFormPage'));
const BrowseRequestsPage = lazy(() => import('@/components/views/BrowseRequestsPage'));
const RequestDetailPage = lazy(() => import('@/components/views/RequestDetailPage'));
const ProposalFormPage = lazy(() => import('@/components/views/ProposalFormPage'));
const BrowseSpecialistsPage = lazy(() => import('@/components/views/BrowseSpecialistsPage'));
const SpecialistProfilePage = lazy(() => import('@/components/views/SpecialistProfilePage'));
const DashboardPage = lazy(() => import('@/components/views/DashboardPage'));
const AdminPage = lazy(() => import('@/components/views/AdminPage'));
const MessagesPage = lazy(() => import('@/components/views/MessagesPage'));
const NotificationsPage = lazy(() => import('@/components/views/NotificationsPage'));
const ProfilePage = lazy(() => import('@/components/views/ProfilePage'));
const PricingPage = lazy(() => import('@/components/views/PricingPage'));
const ComparePage = lazy(() => import('@/components/views/ComparePage'));
const ReviewFormPage = lazy(() => import('@/components/views/ReviewFormPage'));
const ReferralPage = lazy(() => import('@/components/views/ReferralPage'));
const NotificationSettingsPage = lazy(() => import('@/components/views/NotificationSettingsPage'));

// Loading skeleton
function ViewSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4 max-w-5xl mx-auto" dir="rtl">
      <div className="h-4 bg-muted/40 rounded w-1/3" />
      <div className="h-px bg-muted/30" />
      <div className="h-64 bg-muted/30 rounded-xl" />
      <div className="h-48 bg-muted/30 rounded-xl" />
    </div>
  );
}

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

export default function App() {
  const { currentView } = useAppStore();

  // Escape key to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useAppStore.getState().goBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isHome = currentView === 'home';

  const renderContent = useCallback((): ComponentType | null => {
    switch (currentView) {
      case 'login':
      case 'register':
        return null;
      case 'home':
        return HomePage;
      case 'post-need':
        return RequestFormPage;
      case 'browse-requests':
        return BrowseRequestsPage;
      case 'request-detail':
        return RequestDetailPage;
      case 'submit-proposal':
        return ProposalFormPage;
      case 'browse-specialists':
        return BrowseSpecialistsPage;
      case 'specialist-profile':
        return SpecialistProfilePage;
      case 'dashboard':
        return DashboardPage;
      case 'admin':
        return AdminPage;
      case 'messages':
        return MessagesPage;
      case 'notifications':
        return NotificationsPage;
      case 'profile':
        return ProfilePage;
      case 'pricing':
        return PricingPage;
      case 'compare-specialists':
        return ComparePage;
      case 'submit-review':
        return ReviewFormPage;
      case 'referral':
        return ReferralPage;
      case 'notification-settings':
        return NotificationSettingsPage;
      default:
        return null;
    }
  }, [currentView]);

  const ViewComponent = renderContent();

  return (
    <ErrorBoundary>
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

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
          {ViewComponent ? (
            <Suspense fallback={<ViewSkeleton />}>
              <ViewComponent />
            </Suspense>
          ) : null}
        </motion.main>
      </AnimatePresence>

      {isHome ? (
        <Footer />
      ) : (
        <div className="mt-auto">
          <Separator />
          <Footer compact />
        </div>
      )}

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

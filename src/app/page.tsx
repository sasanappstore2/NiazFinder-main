'use client';

import { useEffect, useCallback, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';

// Layout Components
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { AuthModal } from '@/components/auth/AuthModal';
import { BackToTop } from '@/components/shared/BackToTop';
import { QuickActions } from '@/components/shared/QuickActions';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { CookieConsent } from '@/components/shared/CookieConsent';
import { OnboardingWelcome } from '@/components/shared/OnboardingWelcome';
import { Separator } from '@/components/ui/separator';

// View components - direct imports
import HomePage from '@/components/views/HomePage';
import RequestFormPage from '@/components/views/RequestFormPage';
import BrowseRequestsPage from '@/components/views/BrowseRequestsPage';
import RequestDetailPage from '@/components/views/RequestDetailPage';
import ProposalFormPage from '@/components/views/ProposalFormPage';
import BrowseSpecialistsPage from '@/components/views/BrowseSpecialistsPage';
import SpecialistProfilePage from '@/components/views/SpecialistProfilePage';
import DashboardPage from '@/components/views/DashboardPage';
import AdminPage from '@/components/views/AdminPage';
import MessagesPage from '@/components/views/MessagesPage';
import NotificationsPage from '@/components/views/NotificationsPage';
import ProfilePage from '@/components/views/ProfilePage';
import PricingPage from '@/components/views/PricingPage';
import ComparePage from '@/components/views/ComparePage';
import ReviewFormPage from '@/components/views/ReviewFormPage';
import ReferralPage from '@/components/views/ReferralPage';
import NotificationSettingsPage from '@/components/views/NotificationSettingsPage';

// Static view map — avoids creating components during render
const VIEW_MAP: Record<string, ComponentType> = {
  home: HomePage,
  'post-need': RequestFormPage,
  'browse-requests': BrowseRequestsPage,
  'request-detail': RequestDetailPage,
  'submit-proposal': ProposalFormPage,
  'browse-specialists': BrowseSpecialistsPage,
  'specialist-profile': SpecialistProfilePage,
  dashboard: DashboardPage,
  admin: AdminPage,
  messages: MessagesPage,
  notifications: NotificationsPage,
  profile: ProfilePage,
  pricing: PricingPage,
  'compare-specialists': ComparePage,
  'submit-review': ReviewFormPage,
  referral: ReferralPage,
  'notification-settings': NotificationSettingsPage,
};

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
  const ViewComponent = VIEW_MAP[currentView] || null;

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
            {ViewComponent && <ViewComponent />}
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

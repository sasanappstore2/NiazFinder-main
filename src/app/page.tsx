'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';

// Layout
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { AuthModal } from '@/components/auth/AuthModal';
import { BackToTop } from '@/components/shared/BackToTop';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { CookieConsent } from '@/components/shared/CookieConsent';
import { Separator } from '@/components/ui/separator';

// Pages
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

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -12 },
};

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.25,
};

function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustPartnersMarquee />
      <StatsCounter />
      <CategoriesSection />
      <HowItWorks />
      <TopSpecialists />
      <FeaturedRequests />
      <ActivityFeed />
      <PricingSection />
      <CTABanner />
      <TestimonialsSection />
      <FAQSection />
    </>
  );
}

export default function App() {
  const { currentView } = useAppStore();

  // Keyboard shortcut: Escape to go back
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
          {currentView === 'home' && <HomePage />}
          {currentView === 'login' && null /* handled by AuthModal */}
          {currentView === 'register' && null /* handled by AuthModal */}
          {currentView === 'post-need' && (
            <div className="max-w-4xl mx-auto px-4 pb-12">
              <RequestForm />
            </div>
          )}
          {currentView === 'browse-requests' && (
            <div className="max-w-7xl mx-auto px-4 pb-12">
              <BrowseRequests />
            </div>
          )}
          {currentView === 'request-detail' && (
            <div className="max-w-5xl mx-auto px-4 pb-12">
              <RequestDetail />
            </div>
          )}
          {currentView === 'submit-proposal' && (
            <div className="max-w-3xl mx-auto px-4 pb-12">
              <ProposalForm />
            </div>
          )}
          {currentView === 'browse-specialists' && (
            <div className="max-w-7xl mx-auto px-4 pb-12">
              <BrowseSpecialists />
            </div>
          )}
          {currentView === 'specialist-profile' && (
            <div className="max-w-6xl mx-auto px-4 pb-12">
              <SpecialistProfile />
            </div>
          )}
          {currentView === 'dashboard' && (
            <div className="max-w-7xl mx-auto px-4 pb-12">
              <UserDashboard />
            </div>
          )}
          {currentView === 'admin' && (
            <AdminDashboard />
          )}
          {currentView === 'messages' && (
            <div className="max-w-7xl mx-auto px-4 pb-12" style={{ height: 'calc(100vh - 80px)' }}>
              <ChatPanel />
            </div>
          )}
          {currentView === 'notifications' && (
            <div className="max-w-3xl mx-auto px-4 pb-12">
              <NotificationsPanel />
            </div>
          )}
          {currentView === 'profile' && (
            <div className="max-w-5xl mx-auto px-4 pb-12">
              <UserDashboard />
            </div>
          )}
          {currentView === 'pricing' && (
            <div className="max-w-6xl mx-auto px-4 pb-12">
              <PricingSection />
            </div>
          )}
          {currentView === 'compare-specialists' && (
            <div className="max-w-7xl mx-auto px-4 pb-12">
              <CompareSpecialists />
            </div>
          )}
          {currentView === 'submit-review' && (
            <div className="max-w-4xl mx-auto px-4 pb-12">
              <ReviewForm />
            </div>
          )}
          {currentView === 'referral' && (
            <div className="max-w-4xl mx-auto px-4 pb-12">
              <ReferralPage />
            </div>
          )}
          {currentView === 'notification-settings' && (
            <div className="max-w-3xl mx-auto px-4 pb-12">
              <NotificationSettings />
            </div>
          )}
        </motion.main>
      </AnimatePresence>

      {/* Footer — always visible; compact with separator on non-home pages */}
      {isHome ? (
        <Footer />
      ) : (
        <div className="mt-auto">
          <Separator />
          <Footer compact />
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Cookie Consent Banner */}
      <CookieConsent />

      {/* Back to Top Button */}
      <BackToTop />
    </div>
    </ErrorBoundary>
  );
}

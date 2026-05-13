'use client';

import { useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';

// Layout Components
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
  type: 'tween' as const,
  ease: 'easeInOut' as const,
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

  const renderContent = useCallback(() => {
    switch (currentView) {
      case 'login':
      case 'register':
        return null;
      case 'home':
        return <HomePage />;
      case 'post-need':
        return (
          <div className="max-w-4xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb /><Separator className="my-4" /><RequestForm />
          </div>
        );
      case 'browse-requests':
        return (
          <div className="max-w-7xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb /><Separator className="my-4" /><BrowseRequests />
          </div>
        );
      case 'request-detail':
        return (
          <div className="max-w-5xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb /><Separator className="my-4" /><RequestDetail />
          </div>
        );
      case 'submit-proposal':
        return (
          <div className="max-w-3xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb /><Separator className="my-4" /><ProposalForm />
          </div>
        );
      case 'browse-specialists':
        return (
          <div className="max-w-7xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb /><Separator className="my-4" /><BrowseSpecialists />
          </div>
        );
      case 'specialist-profile':
        return (
          <div className="max-w-6xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb /><Separator className="my-4" /><SpecialistProfile />
          </div>
        );
      case 'dashboard':
        return (
          <div className="max-w-7xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb /><Separator className="my-4" /><UserDashboard />
          </div>
        );
      case 'admin':
        return <AdminDashboard />;
      case 'messages':
        return (
          <div className="max-w-7xl mx-auto px-4 pt-2 pb-12" style={{ height: 'calc(100vh - 80px)' }}>
            <Breadcrumb /><Separator className="my-4" /><ChatPanel />
          </div>
        );
      case 'notifications':
        return (
          <div className="max-w-3xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb /><Separator className="my-4" /><NotificationsPanel />
          </div>
        );
      case 'profile':
        return (
          <div className="max-w-5xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb /><Separator className="my-4" /><UserDashboard />
          </div>
        );
      case 'pricing':
        return (
          <div className="max-w-6xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb /><Separator className="my-4" /><PricingSection />
          </div>
        );
      case 'compare-specialists':
        return (
          <div className="max-w-7xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb /><Separator className="my-4" /><CompareSpecialists />
          </div>
        );
      case 'submit-review':
        return (
          <div className="max-w-4xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb /><Separator className="my-4" /><ReviewForm />
          </div>
        );
      case 'referral':
        return (
          <div className="max-w-4xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb /><Separator className="my-4" /><ReferralPage />
          </div>
        );
      case 'notification-settings':
        return (
          <div className="max-w-3xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb /><Separator className="my-4" /><NotificationSettings />
          </div>
        );
      default:
        return null;
    }
  }, [currentView]);

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
          {renderContent()}
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

'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

// Layout
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
import { ScrollProgress } from '@/components/shared/ScrollProgress';
import { Separator } from '@/components/ui/separator';

// Homepage
import { NeedsHomepage } from '@/components/home/NeedsHomepage';
import { CategoryBar } from '@/components/layout/CategoryBar';

// Pages
import { PricingSection } from '@/components/home/PricingSection';
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

function HomePage() {
  return (
    <>
      <NeedsHomepage />
    </>
  );
}

export default function App() {
  const { currentView } = useAppStore();

  const isHome = currentView === 'home';
  const isChatView = currentView === 'messages';

  // Prevent body scroll when chat view is active
  useEffect(() => {
    if (isChatView) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isChatView]);

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

  return (
    <ErrorBoundary>
    <div className={cn(
      'flex flex-col bg-background text-foreground',
      isChatView
        ? 'h-screen overflow-hidden'
        : 'min-h-screen'
    )}>
      <ScrollProgress />
      <Header />
      {!isChatView && <CategoryBar />}

      <main
        id="main-content"
        key={currentView}
        role="main"
        tabIndex={-1}
        className={cn(
          'flex-1 opacity-100 transition-opacity duration-150 ease-in',
          isChatView ? 'flex flex-col overflow-hidden' : '',
          !isHome && !isChatView ? 'pt-6' : ''
        )}
        dir="rtl"
      >
        {currentView === 'home' && <HomePage />}
        {currentView === 'login' && null /* handled by AuthModal */}
        {currentView === 'register' && null /* handled by AuthModal */}
        {currentView === 'post-need' && (
          <div className="max-w-4xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb />
            <Separator className="my-4" />
            <RequestForm />
          </div>
        )}
        {currentView === 'browse-requests' && (
          <div className="max-w-7xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb />
            <Separator className="my-4" />
            <BrowseRequests />
          </div>
        )}
        {currentView === 'request-detail' && (
          <div className="max-w-5xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb />
            <Separator className="my-4" />
            <RequestDetail />
          </div>
        )}
        {currentView === 'submit-proposal' && (
          <div className="max-w-3xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb />
            <Separator className="my-4" />
            <ProposalForm />
          </div>
        )}
        {currentView === 'browse-specialists' && (
          <div className="max-w-7xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb />
            <Separator className="my-4" />
            <BrowseSpecialists />
          </div>
        )}
        {currentView === 'specialist-profile' && (
          <div className="max-w-6xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb />
            <Separator className="my-4" />
            <SpecialistProfile />
          </div>
        )}
        {currentView === 'dashboard' && (
          <div className="max-w-7xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb />
            <Separator className="my-4" />
            <UserDashboard />
          </div>
        )}
        {currentView === 'admin' && (
          <AdminDashboard />
        )}
        {currentView === 'messages' && (
          <div className="flex-1 overflow-hidden">
            <ChatPanel />
          </div>
        )}
        {currentView === 'notifications' && (
          <div className="max-w-3xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb />
            <Separator className="my-4" />
            <NotificationsPanel />
          </div>
        )}
        {currentView === 'profile' && (
          <div className="max-w-5xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb />
            <Separator className="my-4" />
            <UserDashboard />
          </div>
        )}
        {currentView === 'pricing' && (
          <div className="max-w-6xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb />
            <Separator className="my-4" />
            <PricingSection />
          </div>
        )}
        {currentView === 'compare-specialists' && (
          <div className="max-w-7xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb />
            <Separator className="my-4" />
            <CompareSpecialists />
          </div>
        )}
        {currentView === 'submit-review' && (
          <div className="max-w-4xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb />
            <Separator className="my-4" />
            <ReviewForm />
          </div>
        )}
        {currentView === 'referral' && (
          <div className="max-w-4xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb />
            <Separator className="my-4" />
            <ReferralPage />
          </div>
        )}
        {currentView === 'notification-settings' && (
          <div className="max-w-3xl mx-auto px-4 pt-2 pb-12">
            <Breadcrumb />
            <Separator className="my-4" />
            <NotificationSettings />
          </div>
        )}
      </main>

      {/* Footer — hidden on chat view; compact on non-home pages */}
      {!isChatView && (
        isHome ? (
          <Footer />
        ) : (
          <div className="mt-auto">
            <Separator />
            <Footer compact />
          </div>
        )
      )}

      {/* Auth Modal */}
      <AuthModal />

      {/* Onboarding Welcome */}
      <OnboardingWelcome />

      {/* Mobile Bottom Navigation — hidden on chat view */}
      {!isChatView && <MobileBottomNav />}

      {/* Cookie Consent Banner */}
      <CookieConsent />

      {/* Back to Top Button */}
      <BackToTop />

      {/* Quick Actions FAB */}
      <QuickActions />
    </div>
    </ErrorBoundary>
  );
}

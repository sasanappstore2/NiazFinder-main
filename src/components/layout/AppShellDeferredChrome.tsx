'use client';

import dynamic from 'next/dynamic';

const AuthModal = dynamic(
  () => import('@/components/auth/AuthModal').then((m) => m.AuthModal),
  { ssr: false }
);

const OnboardingWelcome = dynamic(
  () => import('@/components/shared/OnboardingWelcome').then((m) => m.OnboardingWelcome),
  { ssr: false }
);

const CookieConsent = dynamic(
  () => import('@/components/shared/CookieConsent').then((m) => m.CookieConsent),
  { ssr: false }
);

const BackToTop = dynamic(
  () => import('@/components/shared/BackToTop').then((m) => m.BackToTop),
  { ssr: false }
);

export { AuthModal, OnboardingWelcome, CookieConsent, BackToTop };

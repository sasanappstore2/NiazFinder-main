'use client';

import { HeroSection } from '@/components/home/HeroSection';
import TrustPartnersMarquee from '@/components/home/TrustPartnersMarquee';
import { StatsCounter } from '@/components/home/StatsCounter';
import { CategoriesSection } from '@/components/home/CategoriesSection';
import { HowItWorks } from '@/components/home/HowItWorks';
import { TopSpecialists } from '@/components/home/TopSpecialists';
import { FeaturedRequests } from '@/components/home/FeaturedRequests';
import { ActivityFeed } from '@/components/home/ActivityFeed';
import { PricingSection } from '@/components/home/PricingSection';
import { CTABanner } from '@/components/home/CTABanner';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { FAQSection } from '@/components/home/FAQSection';

export default function HomePage() {
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

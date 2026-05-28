'use client';

import { Suspense, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Business, OfferCtaType, ProfileSectionId } from '@/contracts/business-profile';
import type { ResolvedProfileLayout } from '@/contracts/business-profile';
import { profileNavSections } from '@/lib/business/resolve-profile-sections';
import { cn } from '@/lib/utils';
import {
  HeroSection,
  AboutSection,
  HighlightsSection,
  ServicesSection,
  ProductsSection,
  PortfolioSection,
  GallerySection,
  CompanyProfileSection,
  CompanyNeedsSection,
  ListingsSection,
  MenuSection,
  CredentialsSection,
  TrustSection,
  SeoSection,
} from './sections/index';

export function renderProfileSection(
  id: ProfileSectionId,
  props: {
    business: Business;
    requestId?: string;
    onOfferAction?: (offerId: string, cta: OfferCtaType) => void;
  }
): ReactNode {
  switch (id) {
    case 'hero':
      return <HeroSection {...props} />;
    case 'highlights':
      return <HighlightsSection {...props} />;
    case 'about':
      return <AboutSection {...props} />;
    case 'services':
      return <ServicesSection {...props} />;
    case 'products':
      return (
        <Suspense
          fallback={
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="aspect-[4/5] w-full rounded-2xl" />
              ))}
            </div>
          }
        >
          <ProductsSection {...props} />
        </Suspense>
      );
    case 'portfolio':
      return <PortfolioSection {...props} />;
    case 'gallery':
      return <GallerySection {...props} />;
    case 'companyProfile':
      return <CompanyProfileSection {...props} />;
    case 'companyNeeds':
      return <CompanyNeedsSection {...props} />;
    case 'listings':
      return <ListingsSection {...props} />;
    case 'menu':
      return <MenuSection {...props} />;
    case 'credentials':
      return <CredentialsSection {...props} />;
    case 'trust':
      return <TrustSection {...props} />;
    case 'contact':
      return null;
    case 'seo':
      return <SeoSection {...props} />;
    default:
      return null;
  }
}

export function ProfileSectionNav({
  layout,
  activeId,
  onNavigate,
}: {
  layout: ResolvedProfileLayout;
  activeId?: string;
  onNavigate: (anchor: string) => void;
}) {
  const navItems = profileNavSections(layout);
  if (navItems.length === 0) return null;

  return (
    <nav
      className="sticky top-16 z-20 -mx-1 hidden overflow-x-auto border-b bg-background/95 pb-0 backdrop-blur supports-backdrop-filter:bg-background/80 lg:flex"
      aria-label="بخش‌های پروفایل"
    >
      <ul className="flex gap-1 py-2">
        {navItems.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onNavigate(s.anchor)}
              className={cn(
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors',
                activeId === s.id
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ProfileShell({
  business,
  requestId,
  children,
}: {
  business: Business;
  requestId?: string;
  children: ReactNode;
}) {
  return (
    <div>
      {renderProfileSection('hero', { business, requestId })}
      <div className="mt-5 sm:mt-6">{children}</div>
    </div>
  );
}

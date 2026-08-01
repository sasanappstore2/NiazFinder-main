import { routeBuilder } from './routes';
import { SITE_LABELS, SITE_NAV_TITLES } from './site-labels';
import type { FooterLinkGroup, NavTab } from '@/contracts/navigation';

export { SITE_LABELS, SITE_NAV_TITLES };

export const MAIN_NAV_TABS: NavTab[] = [
  { id: 'home', label: SITE_LABELS.home, href: routeBuilder.home() },
  { id: 'browse', label: 'مرور بازار', href: routeBuilder.browseAll() },
  { id: 'need', label: SITE_LABELS.needsNav, href: routeBuilder.browseAll({ type: 'need' }) },
  {
    id: 'business',
    label: SITE_LABELS.businessNav,
    href: routeBuilder.browseAll({ type: 'business' }),
  },
  { id: 'post', label: SITE_LABELS.postNeed, href: routeBuilder.needNew() },
];

export const MOBILE_NAV_TABS: NavTab[] = [
  { id: 'needs', label: SITE_LABELS.needsNav, href: routeBuilder.browseAll({ type: 'need' }) },
  {
    id: 'business',
    label: SITE_LABELS.businessNav,
    href: routeBuilder.browseAll({ type: 'business' }),
  },
  { id: 'post', label: SITE_LABELS.postNeed, href: routeBuilder.needNew() },
  { id: 'messages', label: SITE_LABELS.messages, href: routeBuilder.chat() },
  { id: 'dashboard', label: SITE_LABELS.profileNav, href: routeBuilder.dashboard() },
];

export const FOOTER_LINK_GROUPS: FooterLinkGroup[] = [
  {
    title: 'خدمات',
    links: [
      { id: 'home', label: SITE_LABELS.home, href: routeBuilder.home() },
      { id: 'needs', label: SITE_LABELS.marketplaceNeeds, href: routeBuilder.browseAll({ type: 'need' }) },
      { id: 'post', label: SITE_LABELS.postNeed, href: routeBuilder.needNew() },
      {
        id: 'business',
        label: SITE_LABELS.marketplaceBusiness,
        href: routeBuilder.browseAll({ type: 'business' }),
      },
    ],
  },
];

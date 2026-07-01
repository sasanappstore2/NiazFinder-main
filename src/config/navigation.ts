import { routeBuilder } from './routes';
import type { FooterLinkGroup, NavTab } from '@/contracts/navigation';

export const MAIN_NAV_TABS: NavTab[] = [
  { id: 'home',     label: 'خانه',        href: routeBuilder.home() },
  { id: 'browse',   label: 'مرور بازار', href: routeBuilder.browseAll() },
  { id: 'need',     label: 'نیازها',      href: routeBuilder.browseAll({ type: 'need' }) },
  { id: 'business', label: 'کسب‌وکارها', href: routeBuilder.browseAll({ type: 'business' }) },
  { id: 'post',     label: 'ثبت نیاز',   href: routeBuilder.needNew() },
];

export const MOBILE_NAV_TABS: NavTab[] = [
  { id: 'home',      label: 'خانه',     href: routeBuilder.home() },
  { id: 'browse',    label: 'بازار',    href: routeBuilder.browseAll() },
  { id: 'post',      label: 'ثبت',     href: routeBuilder.needNew() },
  { id: 'business',  label: 'کسب‌وکار', href: routeBuilder.browseAll({ type: 'business' }) },
  { id: 'account', label: 'حساب',    href: routeBuilder.account() },
];

export const FOOTER_LINK_GROUPS: FooterLinkGroup[] = [
  {
    title: 'خدمات',
    links: [
      { id: 'home',     label: 'صفحه اصلی',   href: routeBuilder.home() },
      { id: 'browse',   label: 'مرور بازار',  href: routeBuilder.browseAll() },
      { id: 'need',     label: 'مرور نیازها', href: routeBuilder.browseAll({ type: 'need' }) },
      { id: 'post',     label: 'ثبت نیاز',    href: routeBuilder.needNew() },
      { id: 'business', label: 'کسب‌وکارها', href: routeBuilder.browseAll({ type: 'business' }) },
    ],
  },
];

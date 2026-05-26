export interface NavTab {
  id: string;
  label: string;
  href: string;
  icon?: string;
  view?: string;
}

export interface FooterLinkGroup {
  title: string;
  links: Array<{
    id: string;
    label: string;
    href: string;
    view?: string;
  }>;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

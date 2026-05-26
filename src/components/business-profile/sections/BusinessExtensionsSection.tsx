'use client';

import type { Business } from '@/contracts/business-profile';
import { ListingsSection, MenuSection, CredentialsSection } from './VerticalSections';

/** @deprecated Combined vertical blocks — prefer individual sections */
export function BusinessExtensionsSection({ business }: { business: Business }) {
  return (
    <>
      <ListingsSection business={business} />
      <MenuSection business={business} />
      <CredentialsSection business={business} />
    </>
  );
}

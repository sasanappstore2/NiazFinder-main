'use client';

import { BusinessProfileBasicsForm } from '../forms/BusinessProfileBasicsForm';

export function BusinessProfilePanel({
  onSaved,
}: {
  onSaved?: (data: { slug: string; name: string }) => void;
}) {
  return <BusinessProfileBasicsForm onSaved={onSaved} />;
}

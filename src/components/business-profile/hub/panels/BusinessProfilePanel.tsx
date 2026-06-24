'use client';

import { BusinessProfileBasicsForm } from '../forms/BusinessProfileBasicsForm';
import { BusinessAnalyticsPanel } from './BusinessAnalyticsPanel';

export function BusinessProfilePanel({
  onSaved,
}: {
  onSaved?: (data: { slug: string; name: string }) => void;
}) {
  return (
    <div className="space-y-8">
      <BusinessProfileBasicsForm onSaved={onSaved} />
      <BusinessAnalyticsPanel />
    </div>
  );
}

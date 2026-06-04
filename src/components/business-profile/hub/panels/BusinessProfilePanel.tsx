'use client';

import { BusinessProfileBasicsForm } from '../forms/BusinessProfileBasicsForm';
import { BusinessAnalyticsPanel } from './BusinessAnalyticsPanel';
import { BusinessLocationsPanel } from './BusinessLocationsPanel';

export function BusinessProfilePanel({
  onSaved,
}: {
  onSaved?: (data: { slug: string; name: string }) => void;
}) {
  return (
    <div className="space-y-8">
      <BusinessProfileBasicsForm onSaved={onSaved} />
      <BusinessLocationsPanel />
      <BusinessAnalyticsPanel />
    </div>
  );
}

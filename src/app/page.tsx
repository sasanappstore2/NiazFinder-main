'use client';

import { AppShell } from '@/components/layout/AppShell';
import { HomeLeadLanding } from '@/components/home/HomeLeadLanding';

export default function HomePage() {
  return (
    <AppShell>
      <HomeLeadLanding />
    </AppShell>
  );
}

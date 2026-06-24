import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';
import { HomeLeadLandingFallback } from '@/components/home/HomeLeadLanding';

const HomeLeadLanding = dynamic(
  () => import('@/components/home/HomeLeadLanding').then((m) => m.HomeLeadLanding),
  { loading: () => <HomeLeadLandingFallback /> }
);

export default function HomePage() {
  return (
    <AppShell>
      <HomeLeadLanding />
    </AppShell>
  );
}

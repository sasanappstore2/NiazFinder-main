import { notFound } from 'next/navigation';

/** Dev-only playground routes — never reachable in production builds. */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return <>{children}</>;
}

import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';

/**
 * Username deep-link (social layer): /u/{username} resolves the handle and
 * lands on the canonical profile page. Keeps /profile/[id] as the single
 * profile implementation.
 */
export default async function UsernameProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const handle = decodeURIComponent(username).replace(/^@/, '').trim().toLowerCase();
  if (!handle) notFound();

  const user = await db.user.findUnique({
    where: { username: handle },
    select: { id: true, isActive: true, isBanned: true },
  });

  if (!user || !user.isActive || user.isBanned) notFound();

  redirect(`/profile/${user.id}`);
}

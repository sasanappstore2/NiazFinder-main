import { redirect } from 'next/navigation';

/** Alias for super-admin migration dashboard. */
export default function AdminIntakeMigrationAliasPage() {
  redirect('/super-admin/system/intake-migration');
}

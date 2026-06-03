import { redirect } from 'next/navigation';

export default function AdminUsersRoute() {
  redirect('/super-admin/users');
}

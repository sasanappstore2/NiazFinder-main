import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';

/** Legacy URL — canonical workspace hub is /workspace */
export default function DashboardRedirectPage() {
  redirect(ROUTES.workspace);
}

import { redirect } from 'next/navigation';

/** V2 chat frozen for launch — canonical intake is /post */
export default function V2IntakePage() {
  redirect('/post');
}

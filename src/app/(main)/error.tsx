'use client';

import { SegmentErrorFallback } from '@/components/shared/SegmentErrorFallback';

export default function GroupError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentErrorFallback {...props} />;
}

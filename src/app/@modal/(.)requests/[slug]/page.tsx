'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { RequestDetail } from '@/components/requests/RequestDetail';

// Prevent the page from being added to the browser history
// when the modal is opened
interface InterceptedRequestModalProps {
  params: Promise<{ slug: string }>;
}

export default function InterceptedRequestModal({ params }: InterceptedRequestModalProps) {
  const { slug } = use(params);
  const router = useRouter();

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.back();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return (
    <Dialog open onOpenChange={(open) => !open && router.back()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogTitle className="sr-only">جزئیات درخواست</DialogTitle>
        <RequestDetail slug={slug} />
      </DialogContent>
    </Dialog>
  );
}

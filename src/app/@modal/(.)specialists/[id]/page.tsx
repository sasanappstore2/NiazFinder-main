'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { SpecialistProfile } from '@/components/specialists/SpecialistProfile';

interface InterceptedSpecialistModalProps {
  params: Promise<{ id: string }>;
}

export default function InterceptedSpecialistModal({ params }: InterceptedSpecialistModalProps) {
  const { id } = use(params);
  const router = useRouter();

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
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogTitle className="sr-only">پروفایل متخصص</DialogTitle>
        <SpecialistProfile specialistId={id} />
      </DialogContent>
    </Dialog>
  );
}

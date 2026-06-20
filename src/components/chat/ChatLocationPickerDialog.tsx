'use client';

import { useEffect, useState } from 'react';
import { BusinessMapPinPicker } from '@/components/business/map/BusinessMapPinPicker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function ChatLocationPickerDialog({
  open,
  onOpenChange,
  city,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  city: string;
  onConfirm: (coords: { lat: number; lng: number }) => void | Promise<void>;
  busy?: boolean;
}) {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setLat(null);
      setLng(null);
    }
  }, [open]);

  const handleConfirm = () => {
    if (lat == null || lng == null) return;
    void onConfirm({ lat, lng });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-4 sm:max-w-xl" dir="rtl">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>انتخاب موقعیت روی نقشه</DialogTitle>
          <DialogDescription>
            روی نقشه کلیک کنید یا مارکر را جابه‌جا کنید، سپس موقعیت را ارسال کنید.
          </DialogDescription>
        </DialogHeader>

        <BusinessMapPinPicker
          city={city}
          lat={lat}
          lng={lng}
          onChange={(coords) => {
            if (!coords) {
              setLat(null);
              setLng(null);
              return;
            }
            setLat(coords.lat);
            setLng(coords.lng);
          }}
        />

        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={busy || lat == null || lng == null}
          >
            ارسال موقعیت
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            انصراف
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

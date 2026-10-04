'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { ImageCropGuideOverlay } from '@/components/shared/ImageCropGuideOverlay';
import {
  cropImageToBlob,
  cropImageWithSimulatedBackground,
  detectImageBackgroundColor,
  type CropMediaSize,
  type CropOutputSize,
} from '@/lib/image/crop-image';

export function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  aspect,
  outputSize,
  title,
  description,
  onConfirm,
  simulateBackground = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  aspect: number;
  outputSize: CropOutputSize;
  title: string;
  description?: string;
  /** Return false to keep dialog open (e.g. upload failed). */
  onConfirm: (blob: Blob) => void | Promise<void> | Promise<boolean>;
  simulateBackground?: boolean;
}) {
  const cropAreaRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [mediaSize, setMediaSize] = useState<CropMediaSize | null>(null);
  const [cropAreaSize, setCropAreaSize] = useState({ width: 0, height: 0 });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#f4f4f5');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !imageSrc) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setMediaSize(null);
    setCropAreaSize({ width: 0, height: 0 });
    setCroppedAreaPixels(null);
    if (simulateBackground) {
      void detectImageBackgroundColor(imageSrc).then(setBackgroundColor);
    }
  }, [open, imageSrc, simulateBackground]);

  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = cropAreaRef.current;
      if (!el) return;
      setCropAreaSize({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    };
    measure();
    const t1 = requestAnimationFrame(() => {
      requestAnimationFrame(measure);
    });
    const el = cropAreaRef.current;
    if (!el) return () => cancelAnimationFrame(t1);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(t1);
      ro.disconnect();
    };
  }, [open, imageSrc]);

  const onMediaLoaded = useCallback((media: CropMediaSize) => {
    setMediaSize({
      width: media.width,
      height: media.height,
      naturalWidth: media.naturalWidth,
      naturalHeight: media.naturalHeight,
    });
  }, []);

  const onCropSizeChange = useCallback((size: { width: number; height: number }) => {
    if (size.width > 0 && size.height > 0) {
      setCropAreaSize(size);
    }
  }, []);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const effectiveCropSize =
    cropAreaSize.width > 0 && cropAreaSize.height > 0
      ? cropAreaSize
      : null;

  const canExport = !!imageSrc && !!mediaSize && !!effectiveCropSize;

  const handleConfirm = async () => {
    if (!canExport || !imageSrc || !mediaSize || !effectiveCropSize) {
      toast.error('لطفاً چند لحظه صبر کنید تا تصویر آماده شود');
      return;
    }

    setSaving(true);
    try {
      let blob: Blob;
      if (simulateBackground) {
        blob = await cropImageWithSimulatedBackground(
          imageSrc,
          {
            crop,
            zoom,
            mediaSize,
            cropAreaSize: effectiveCropSize,
          },
          outputSize,
          backgroundColor
        );
      } else if (croppedAreaPixels) {
        blob = await cropImageToBlob(imageSrc, croppedAreaPixels, outputSize);
      } else {
        throw new Error('Crop not ready');
      }

      const ok = await onConfirm(blob);
      if (ok !== false) {
        onOpenChange(false);
      }
    } catch (err) {
      console.error('Image crop export failed:', err);
      toast.error('برش تصویر انجام نشد. دوباره تلاش کنید.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="space-y-1 border-b border-border/60 px-4 py-3 pe-12 sm:px-5 sm:pe-12">
          <DialogTitle className="text-base">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-xs">{description}</DialogDescription>
          ) : null}
          {simulateBackground ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              پس‌زمینه از حاشیهٔ عکس تشخیص داده شد — لوگوی افقی را جابه‌جا و کوچک کنید تا
              ترکیب دلخواه بسازید.
            </p>
          ) : null}
        </DialogHeader>

        <div
          ref={cropAreaRef}
          className="image-crop-stage relative w-full max-h-[min(72vh,26rem)]"
          style={{
            aspectRatio: aspect,
            backgroundColor: simulateBackground ? backgroundColor : undefined,
          }}
        >
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape="rect"
              showGrid={false}
              restrictPosition={false}
              minZoom={0.25}
              maxZoom={3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onMediaLoaded={onMediaLoaded}
              onCropSizeChange={onCropSizeChange}
              onCropComplete={onCropComplete}
              style={{
                containerStyle: { borderRadius: 0 },
                cropAreaStyle: {
                  border: 'none',
                  boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.5)',
                },
              }}
              classes={{
                containerClassName: 'rounded-none',
                cropAreaClassName: 'image-crop-area-chrome',
              }}
            />
          ) : null}
          {effectiveCropSize ? (
            <ImageCropGuideOverlay
              width={effectiveCropSize.width}
              height={effectiveCropSize.height}
            />
          ) : null}
        </div>

        <div className="space-y-3 border-t border-border/60 px-4 py-3 sm:px-5">
          {simulateBackground ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-muted-foreground">رنگ پس‌زمینه</span>
              <label className="flex cursor-pointer items-center gap-2">
                <span
                  className="size-8 rounded-lg border border-border shadow-inner"
                  style={{ backgroundColor }}
                  aria-hidden
                />
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="sr-only"
                  aria-label="تغییر رنگ پس‌زمینه"
                />
                <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                  {backgroundColor}
                </span>
              </label>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>بزرگ‌نمایی</span>
            <span>{Math.round(zoom * 100)}٪</span>
          </div>
          <Slider
            min={0.25}
            max={3}
            step={0.02}
            value={[zoom]}
            onValueChange={([z]) => setZoom(z ?? 1)}
            aria-label="بزرگ‌نمایی تصویر"
          />
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 px-4 py-3 sm:px-5 sm:justify-start">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            انصراف
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={saving || !canExport}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                در حال ذخیره…
              </>
            ) : (
              'تأیید و آپلود'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import * as React from 'react';
import Image from 'next/image';
import { Camera, Crop, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { ImageCropDialog } from '@/components/shared/ImageCropDialog';
import {
  BUSINESS_CROP_ASPECT,
  BUSINESS_CROP_OUTPUT,
} from '@/lib/image/crop-image';
import { cn } from '@/lib/utils';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';

export function BusinessImageUpload({
  label,
  hint,
  value,
  kind,
  aspectClass,
  onChange,
  error,
}: {
  label: string;
  hint?: string;
  value: string;
  kind: 'logo' | 'cover';
  aspectClass: string;
  onChange: (url: string) => void;
  error?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const [cropOpen, setCropOpen] = React.useState(false);
  const previewUrlRef = React.useRef<string | null>(null);

  const revokePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  React.useEffect(() => () => revokePreview(), []);

  const uploadBlob = async (blob: Blob): Promise<boolean> => {
    setUploading(true);
    try {
      const fd = new FormData();
      const file = new File([blob], `${kind}-cropped.jpg`, { type: 'image/jpeg' });
      fd.append('file', file);
      fd.append('kind', kind);
      const res = await fetch('/api/business/me/media', {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: fd,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'آپلود ناموفق بود');
        return false;
      }
      onChange(data.url);
      toast.success('تصویر ذخیره شد');
      return true;
    } catch {
      toast.error('خطا در آپلود تصویر');
      return false;
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const openCropForFile = (file: File) => {
    revokePreview();
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setCropSrc(url);
    setCropOpen(true);
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('فقط فایل تصویری مجاز است');
      return;
    }
    openCropForFile(file);
  };

  const handleCropDialogChange = (open: boolean) => {
    setCropOpen(open);
    if (!open) {
      setCropSrc(null);
      revokePreview();
    }
  };

  const cropTitle = kind === 'logo' ? 'برش لوگو' : 'برش تصویر کاور';
  const cropDescription =
    kind === 'logo'
      ? 'لوگوی افقی را جابه‌جا کنید؛ پس‌زمینهٔ عکس حفظ می‌شود.'
      : 'کادر افقی؛ پس‌زمینهٔ عکس در نواحی خالی تکرار می‌شود.';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {value && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onChange('')}
          >
            حذف
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border border-dashed border-emerald-500/30 bg-muted/30',
          aspectClass,
          error && 'border-destructive'
        )}
      >
        {value ? (
          <>
            <Image src={value} alt="" fill className="object-cover" unoptimized />
            <div className="absolute top-2 end-2 flex gap-1.5">
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-full bg-background/90 shadow"
                onClick={() => inputRef.current?.click()}
                aria-label="تغییر و برش تصویر"
                disabled={uploading}
              >
                <Crop className="size-4" />
              </button>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-full bg-background/90 shadow"
                onClick={() => onChange('')}
                aria-label="حذف تصویر"
              >
                <X className="size-4" />
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-muted-foreground transition-colors hover:bg-emerald-500/5 hover:text-emerald-700"
          >
            {uploading ? (
              <Loader2 className="size-8 animate-spin text-emerald-600" />
            ) : (
              <Camera className="size-8 text-emerald-600/80" />
            )}
            <span className="text-xs font-medium">
              {uploading ? 'در حال آپلود…' : 'انتخاب و برش تصویر'}
            </span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      <ImageCropDialog
        open={cropOpen}
        onOpenChange={handleCropDialogChange}
        imageSrc={cropSrc}
        aspect={BUSINESS_CROP_ASPECT[kind]}
        outputSize={BUSINESS_CROP_OUTPUT[kind]}
        title={cropTitle}
        description={cropDescription}
        simulateBackground
        onConfirm={uploadBlob}
      />
    </div>
  );
}

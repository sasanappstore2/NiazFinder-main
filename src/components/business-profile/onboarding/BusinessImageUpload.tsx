'use client';

import * as React from 'react';
import Image from 'next/image';
import { Camera, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
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

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
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
        return;
      }
      onChange(data.url);
    } catch {
      toast.error('خطا در آپلود تصویر');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

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
            <button
              type="button"
              className="absolute top-2 end-2 flex size-8 items-center justify-center rounded-full bg-background/90 shadow"
              onClick={() => onChange('')}
              aria-label="حذف تصویر"
            >
              <X className="size-4" />
            </button>
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
              {uploading ? 'در حال آپلود…' : 'انتخاب تصویر'}
            </span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

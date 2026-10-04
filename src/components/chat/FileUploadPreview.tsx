'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mv } from '@/lib/motion-variants';
import {
  Image,
  FileText,
  X,
  SendHorizontal,
  Paperclip,
  Camera,
  File,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toPersianDigits } from '@/lib/format/digits';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface FileUploadPreviewProps {
  onSend: (files: File[], caption: string) => void;
  onCancel: () => void;
}

interface SelectedFile {
  file: File;
  preview?: string; // base64 data URL for images
  id: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (file: File) => {
  if (file.type.startsWith('image/')) return Image;
  if (file.type.includes('pdf')) return FileText;
  if (file.type.includes('zip') || file.type.includes('rar')) return File;
  if (file.type.includes('doc')) return FileText;
  return FileText;
};

const getFileColor = (file: File) => {
  if (file.type.startsWith('image/')) return 'text-emerald-500';
  if (file.type.includes('pdf')) return 'text-rose-500';
  if (file.type.includes('zip') || file.type.includes('rar')) return 'text-amber-500';
  return 'text-blue-500';
};

const ACCEPTED_TYPES = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar';
const MAX_VISIBLE_THUMBNAILS = 4;

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

const containerVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.06,
    },
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.97,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.15 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function FileUploadPreview({ onSend, onCancel }: FileUploadPreviewProps) {
  // ─── State ────────────────────────────────────────────────────────────
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);

  // ─── Refs ─────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Computed ─────────────────────────────────────────────────────────
  const imageFiles = useMemo(
    () => selectedFiles.filter((f) => f.file.type.startsWith('image/')),
    [selectedFiles]
  );

  const nonImageFiles = useMemo(
    () => selectedFiles.filter((f) => !f.file.type.startsWith('image/')),
    [selectedFiles]
  );

  const totalSize = useMemo(
    () => selectedFiles.reduce((sum, f) => sum + f.file.size, 0),
    [selectedFiles]
  );

  const visibleImages = useMemo(
    () => imageFiles.slice(0, MAX_VISIBLE_THUMBNAILS),
    [imageFiles]
  );

  const extraImageCount = useMemo(
    () => Math.max(0, imageFiles.length - MAX_VISIBLE_THUMBNAILS),
    [imageFiles]
  );

  // ─── File Selection Handler ──────────────────────────────────────────
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList || fileList.length === 0) return;

      const newFiles: SelectedFile[] = Array.from(fileList).map((file) => {
        const preview = file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined;
        return {
          file,
          preview,
          id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        };
      });

      setSelectedFiles((prev) => [...prev, ...newFiles]);

      // Reset input so same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    []
  );

  // ─── Remove File ──────────────────────────────────────────────────────
  const removeFile = useCallback((id: string) => {
    setSelectedFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.preview) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  // ─── Trigger File Input ───────────────────────────────────────────────
  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ─── Send Handler ─────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (selectedFiles.length === 0 || sending) return;

    setSending(true);
    try {
      const files = selectedFiles.map((f) => f.file);
      onSend(files, caption.trim());
    } finally {
      setSending(false);
    }
  }, [selectedFiles, caption, sending, onSend]);

  // ─── Cancel Handler ───────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    // Cleanup all blob URLs
    selectedFiles.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setSelectedFiles([]);
    setCaption('');
    onCancel();
  }, [selectedFiles, onCancel]);

  // ─── Cleanup on Unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      selectedFiles.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
    };
  }, [selectedFiles]);

  // ─── Don't render if no files selected ────────────────────────────────
  if (selectedFiles.length === 0) {
    return (
      <>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        <motion.div
          key="file-upload-preview"
          variants={mv(containerVariants)}
          initial="hidden"
          animate="visible"
          exit="exit"
          dir="rtl"
          className="mx-auto w-full max-w-3xl rounded-xl border border-border/50 bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur-xs"
        >
          {/* ─── Header: file count + total size + add more ─── */}
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Paperclip className="h-4 w-4" />
              <span>
                {toPersianDigits(selectedFiles.length.toString())} فایل انتخاب
                شده
              </span>
              <span className="text-xs text-muted-foreground/70">
                ({toPersianDigits(formatFileSize(totalSize))})
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={triggerFileInput}
              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary"
            >
              <Camera className="h-3.5 w-3.5" />
              افزودن بیشتر
            </Button>
          </div>

          {/* ─── Image Thumbnails Grid ─── */}
          {imageFiles.length > 0 && (
            <div className="mb-2 grid grid-cols-4 gap-2 sm:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {visibleImages.map((item) => (
                  <motion.div
                    key={item.id}
                    variants={mv(itemVariants)}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    className="group relative aspect-square overflow-hidden rounded-lg border border-border/40 bg-muted/30"
                  >
                    {/* Image thumbnail */}
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 flex items-end bg-linear-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

                    {/* File size badge */}
                    <div className="absolute bottom-1 right-1 rounded-md bg-black/50 px-1.5 py-0.5 text-caption text-white/90 backdrop-blur-xs">
                      {toPersianDigits(formatFileSize(item.file.size))}
                    </div>

                    {/* Remove button */}
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeFile(item.id)}
                      className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white/90 backdrop-blur-xs transition-colors hover:bg-destructive"
                      aria-label="حذف فایل"
                    >
                      <X className="h-3 w-3" />
                    </motion.button>
                  </motion.div>
                ))}

                {/* "+N more" overlay indicator */}
                {extraImageCount > 0 && (
                  <motion.div
                    key="more-indicator"
                    variants={mv(itemVariants)}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="relative aspect-square overflow-hidden rounded-lg border border-border/40 bg-muted"
                  >
                    {/* Use last visible image as background */}
                    {visibleImages.length > 0 && (
                      <img
                        src={visibleImages[visibleImages.length - 1].preview}
                        alt=""
                        className="h-full w-full object-cover blur-xs opacity-40"
                      />
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
                      <span className="text-lg font-bold">
                        +{toPersianDigits(extraImageCount.toString())}
                      </span>
                      <span className="text-caption text-white/70">
                        فایل دیگر
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ─── Non-Image File List ─── */}
          {nonImageFiles.length > 0 && (
            <div className="mb-2 space-y-1.5">
              <AnimatePresence mode="popLayout">
                {nonImageFiles.map((item) => {
                  const FileIcon = getFileIcon(item.file);
                  const fileColor = getFileColor(item.file);

                  return (
                    <motion.div
                      key={item.id}
                      variants={mv(itemVariants)}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                      className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/50"
                    >
                      {/* File type icon */}
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted',
                          fileColor
                        )}
                      >
                        <FileIcon className="h-4.5 w-4.5" />
                      </div>

                      {/* File name + size */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-tight">
                          {item.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {toPersianDigits(formatFileSize(item.file.size))}
                        </p>
                      </div>

                      {/* Remove button */}
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeFile(item.id)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label="حذف فایل"
                      >
                        <X className="h-3.5 w-3.5" />
                      </motion.button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* ─── Caption Input ─── */}
          <div className="mb-2">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="افزودن توضیحات (اختیاری)..."
              dir="rtl"
              className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-hidden focus:ring-1 focus:ring-primary/20"
              maxLength={500}
            />
            <div className="mt-0.5 text-left text-caption text-muted-foreground/50">
              {toPersianDigits(caption.length.toString())}/۵۰۰
            </div>
          </div>

          {/* ─── Action Buttons ─── */}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 gap-1.5 text-sm text-muted-foreground hover:text-destructive"
              disabled={sending}
            >
              <X className="h-3.5 w-3.5" />
              انصراف
            </Button>

            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending || selectedFiles.length === 0}
              className="h-8 gap-1.5 bg-emerald-600 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {sending ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                />
              ) : (
                <SendHorizontal className="h-3.5 w-3.5" />
              )}
              ارسال
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

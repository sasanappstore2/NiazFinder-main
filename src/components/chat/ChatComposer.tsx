'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Mic,
  Paperclip,
  Phone,
  Reply,
  SendHorizontal,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAutoResizeTextarea } from '@/hooks/use-auto-resize-textarea';
import { cn } from '@/lib/utils';
import {
  VoiceRecorder,
  type VoiceRecorderHandle,
  type VoiceRecorderPhase,
} from '@/components/chat/VoiceRecorder';

export type VoiceComposePhase = VoiceRecorderPhase;

export interface ChatComposerReply {
  senderName: string;
  content: string;
}

export interface ChatComposerProps {
  message: string;
  onMessageChange: (value: string) => void;
  onSendText: () => void;
  onSendVoice: (blob: Blob) => void | Promise<void>;
  isSending?: boolean;
  attachmentBusy?: boolean;
  disabled?: boolean;
  placeholder?: string;
  replyTo?: ChatComposerReply | null;
  onClearReply?: () => void;
  onPickImage: () => void;
  onPickFile: () => void;
  onShareLocation: () => void;
  onShareContact: () => void;
  onVoicePhaseChange?: (phase: VoiceComposePhase) => void;
  /** Optional ref for parent focus (e.g. reply-to-message). */
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}

export function ChatComposer({
  message,
  onMessageChange,
  onSendText,
  onSendVoice,
  isSending = false,
  attachmentBusy = false,
  disabled = false,
  placeholder = 'پیام خود را بنویسید…',
  replyTo,
  onClearReply,
  onPickImage,
  onPickFile,
  onShareLocation,
  onShareContact,
  onVoicePhaseChange,
  textareaRef: externalTextareaRef,
}: ChatComposerProps) {
  const [voicePhase, setVoicePhase] = useState<VoiceComposePhase>('idle');
  const voiceRecorderRef = useRef<VoiceRecorderHandle>(null);

  const { textareaRef: internalTextareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 44,
    maxHeight: 128,
  });

  useEffect(() => {
    if (!externalTextareaRef) return;
    externalTextareaRef.current = internalTextareaRef.current;
  });

  const hasText = Boolean(message.trim());
  const voiceActive = voicePhase !== 'idle';
  const busy = disabled || isSending || attachmentBusy;
  const canSendText = hasText && !busy && !voiceActive;

  const handleVoicePhase = useCallback(
    (phase: VoiceComposePhase) => {
      setVoicePhase(phase);
      onVoicePhaseChange?.(phase);
    },
    [onVoicePhaseChange]
  );

  const handleVoiceError = useCallback(
    (code: 'permission' | 'unsupported' | 'too_short' | 'unknown') => {
      if (code === 'permission') {
        toast.error('برای ضبط صدا به میکروفون اجازه دهید');
      } else if (code === 'unsupported') {
        toast.error('مرورگر شما ضبط صدا را پشتیبانی نمی‌کند');
      } else if (code === 'too_short') {
        toast.error('پیام صوتی خیلی کوتاه است — دوباره ضبط کنید');
      } else {
        toast.error('ضبط یا ارسال صدا ممکن نشد — دوباره تلاش کنید');
      }
    },
    []
  );

  const handleSendText = useCallback(() => {
    if (!canSendText) return;
    onSendText();
    requestAnimationFrame(() => adjustHeight(true));
  }, [canSendText, onSendText, adjustHeight]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const startVoiceRecording = () => {
    voiceRecorderRef.current?.startRecording();
  };

  return (
    <div
      className="shrink-0 border-t bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80"
      dir="rtl"
    >
      {replyTo && (
        <div
          className="flex items-center gap-2 border-b border-border/50 bg-muted/40 px-3 py-2 md:px-4"
          role="status"
          aria-label={`پاسخ به ${replyTo.senderName}`}
        >
          <Reply className="size-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1 border-s-2 border-primary/70 ps-2">
            <p className="text-xs font-medium text-foreground">{replyTo.senderName}</p>
            <p className="truncate text-xs text-muted-foreground">{replyTo.content}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-full"
            onClick={onClearReply}
            aria-label="لغو پاسخ"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      <div className="px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:px-4 md:py-3">
        {!voiceActive && (
          <div
            className={cn(
              'flex items-end gap-1.5 rounded-[1.25rem] border border-border/70 bg-muted/30 p-1.5',
              'shadow-sm transition-shadow focus-within:border-primary/35 focus-within:ring-2 focus-within:ring-primary/15',
              busy && 'opacity-80'
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                  aria-label="پیوست — عکس، فایل، موقعیت یا تماس"
                  title="پیوست‌ها"
                  disabled={busy}
                >
                  {attachmentBusy ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Paperclip className="size-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56 sm:w-60">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  اشتراک با مخاطب
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onSelect={(ev) => {
                    ev.preventDefault();
                    onPickImage();
                  }}
                >
                  <ImageIcon className="size-4 text-primary" />
                  عکس
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onSelect={(ev) => {
                    ev.preventDefault();
                    onPickFile();
                  }}
                >
                  <FileText className="size-4 text-primary" />
                  فایل (PDF یا تصویر)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => onShareLocation()}>
                  <MapPin className="size-4 text-primary" />
                  موقعیت روی نقشه
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onSelect={() => void onShareContact()}
                >
                  <Phone className="size-4 text-primary" aria-hidden />
                  اشتراک شمارهٔ تماس
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Textarea
              ref={internalTextareaRef}
              placeholder={placeholder}
              value={message}
              onChange={(e) => {
                onMessageChange(e.target.value);
                adjustHeight();
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={busy}
              aria-label="متن پیام"
              className="min-h-[44px] max-h-32 flex-1 resize-none border-0 bg-transparent px-1 py-2.5 text-sm shadow-none focus-visible:ring-0"
            />

            {hasText ? (
              <Button
                type="button"
                size="icon"
                onClick={handleSendText}
                disabled={!canSendText}
                className={cn(
                  'size-11 shrink-0 rounded-full transition-colors',
                  canSendText
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : 'bg-muted text-muted-foreground'
                )}
                aria-label="ارسال پیام"
              >
                {isSending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <SendHorizontal className="size-5" />
                )}
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={busy}
                className="size-11 shrink-0 rounded-full text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600"
                onClick={startVoiceRecording}
                aria-label="ضبط پیام صوتی"
              >
                <Mic className="size-5" />
              </Button>
            )}
          </div>
        )}

        <div className={cn(!voiceActive && 'sr-only h-0 overflow-hidden')}>
          <VoiceRecorder
            ref={voiceRecorderRef}
            hideIdle
            disabled={busy}
            onPhaseChange={handleVoicePhase}
            onCancel={() => handleVoicePhase('idle')}
            onSend={async (blob) => {
              await onSendVoice(blob);
            }}
            onError={handleVoiceError}
          />
        </div>

        {!voiceActive && (
          <p className="mt-1.5 hidden text-center text-[10px] text-muted-foreground/70 sm:block">
            Enter برای ارسال · Shift+Enter خط جدید
          </p>
        )}
      </div>
    </div>
  );
}

'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Loader2, MapPin, Mic, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PersianDigitInput } from '@/components/ui/persian-digit-input';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAutoResizeTextarea } from '@/hooks/use-auto-resize-textarea';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { cn } from '@/lib/utils';
import { fib } from './ai-lead-tokens';

export interface NeedLeadPromptBoxProps {
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** When true, send is disabled and the send button shows a spinner. */
  isSubmitting?: boolean;
  phone: string;
  onPhoneChange: (value: string) => void;
  cityLabel: string;
  hasCity: boolean;
  isGeoDetecting: boolean;
  onOpenCityPicker: () => void;
  onDetectLocation: () => void;
  /** When false (default), phone is not collected here — only at final publish/login. */
  showPhoneField?: boolean;
  placeholder?: string;
  className?: string;
}

function ToggleChip({
  active,
  disabled,
  onClick,
  icon,
  label,
  activeClassName,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  activeClassName?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-8 items-center gap-1 rounded-full border px-2 py-1 transition-all',
        active
          ? cn(
              'border-primary/50 bg-primary/10 text-primary',
              activeClassName
            )
          : 'border-transparent bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground',
        disabled && 'pointer-events-none opacity-60'
      )}
    >
      <span className="flex size-5 shrink-0 items-center justify-center">
        {icon}
      </span>
      <AnimatePresence>
        {active && (
          <motion.span
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden whitespace-nowrap text-xs"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

function VerticalDivider() {
  return (
    <span
      className="mx-0.5 h-5 w-px shrink-0 bg-border/60"
      aria-hidden
    />
  );
}

export function NeedLeadPromptBox({
  inputRef,
  value,
  onChange,
  onSubmit,
  phone,
  onPhoneChange,
  cityLabel,
  hasCity,
  isGeoDetecting,
  onOpenCityPicker,
  onDetectLocation,
  showPhoneField = false,
  placeholder = 'مثلاً: به تعمیرکار کولر در غرب تهران نیاز دارم…',
  className,
  isSubmitting = false,
}: NeedLeadPromptBoxProps) {
  const [showLocation, setShowLocation] = useState(hasCity);
  const [showContact, setShowContact] = useState(
    () => showPhoneField && Boolean(phone.trim())
  );
  const geoTriggeredRef = useRef(false);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: fib.xl,
    maxHeight: fib.xxl + fib.lg,
  });

  const setRefs = useCallback(
    (el: HTMLTextAreaElement | null) => {
      textareaRef.current = el;
      if (inputRef) inputRef.current = el;
    },
    [inputRef, textareaRef]
  );

  const canSend = Boolean(value.trim()) && !isSubmitting;
  const speechBaseRef = useRef('');

  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechToText({
    lang: 'fa-IR',
    onError: (code) =>
      toast.error('ورودی صوتی', {
        description: code,
        duration: 10_000,
      }),
  });

  useEffect(() => {
    const spoken = [transcript, interimTranscript].filter(Boolean).join(' ').trim();
    if (!spoken && !isListening) return;

    const base = speechBaseRef.current;
    const merged = base && spoken ? `${base} ${spoken}`.trim() : base || spoken;
    if (merged !== value) {
      onChange(merged);
      adjustHeight();
    }
  }, [transcript, interimTranscript, isListening, value, onChange, adjustHeight]);

  const handleSpeechToggle = () => {
    if (isListening) {
      stopListening();
      return;
    }
    speechBaseRef.current = value.trim();
    resetTranscript();
    startListening();
  };

  useEffect(() => {
    if (hasCity) setShowLocation(true);
  }, [hasCity]);

  useEffect(() => {
    if (showPhoneField && phone.trim()) setShowContact(true);
  }, [phone, showPhoneField]);

  useEffect(() => {
    if (!showLocation) {
      geoTriggeredRef.current = false;
      return;
    }
    if (hasCity || isGeoDetecting || geoTriggeredRef.current) return;
    geoTriggeredRef.current = true;
    onDetectLocation();
  }, [showLocation, hasCity, isGeoDetecting, onDetectLocation]);

  const handleLocationToggle = () => {
    if (showLocation) {
      onOpenCityPicker();
      return;
    }
    setShowLocation(true);
    if (!hasCity && !isGeoDetecting) {
      geoTriggeredRef.current = true;
      onDetectLocation();
    }
  };

  const locationLabel = hasCity ? cityLabel : 'مکان';

  return (
    <div
      dir="rtl"
      className={cn(
        'rounded-3xl border border-border/60 bg-card/90 p-2 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] backdrop-blur-xl',
        'transition-all duration-300 focus-within:border-primary/35',
        'dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.45)]',
        className
      )}
    >
      <div className="px-1 pt-1">
        <Textarea
          ref={setRefs}
          data-ai-lead-input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            adjustHeight();
          }}
          placeholder={placeholder}
          className={cn(
            'min-h-[55px] resize-none border-0 bg-transparent px-3 py-2.5',
            'text-base leading-[1.618] shadow-none',
            'focus-visible:ring-0 focus-visible:ring-offset-0',
            'placeholder:text-muted-foreground/80',
            'scrollbar-thin'
          )}
          style={{ overflow: 'hidden' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!isSubmitting) onSubmit();
            }
          }}
        />
      </div>

      <AnimatePresence>
        {showPhoneField && showContact && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-2"
          >
            <div className="relative pb-2">
              <Phone className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <PersianDigitInput
                variant="phone"
                dir="ltr"
                className="h-10 rounded-xl border-border/50 bg-muted/30 pr-10 text-left text-sm"
                placeholder="09123456789 — اختیاری"
                value={phone}
                onChange={onPhoneChange}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-2 px-1 pb-1 pt-2">
        <div className="flex min-w-0 flex-1 items-center gap-0.5">
          <ToggleChip
            active={showLocation}
            disabled={isGeoDetecting && !hasCity}
            onClick={handleLocationToggle}
            label={locationLabel}
            icon={
              isGeoDetecting && showLocation && !hasCity ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <motion.div
                  animate={{
                    scale: showLocation ? 1.05 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <MapPin
                    className={cn(
                      'size-4',
                      showLocation ? 'text-primary' : 'text-inherit'
                    )}
                  />
                </motion.div>
              )
            }
          />

          {isSupported ? (
            <>
              <VerticalDivider />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <ToggleChip
                      active={isListening}
                      disabled={isSubmitting}
                      onClick={handleSpeechToggle}
                      label={isListening ? 'در حال شنیدن' : 'میکروفون'}
                      activeClassName="border-destructive/40 bg-destructive/10 text-destructive"
                      icon={
                        isListening ? (
                          <motion.span
                            animate={{ scale: [1, 1.12, 1] }}
                            transition={{ repeat: Infinity, duration: 1.2 }}
                            className="relative flex size-5 items-center justify-center"
                          >
                            <span className="absolute inset-0 rounded-full bg-destructive/25" />
                            <Mic className="relative size-4 text-destructive" />
                          </motion.span>
                        ) : (
                          <Mic className="size-4" />
                        )
                      }
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-center leading-relaxed">
                  {isListening
                    ? 'صحبت کنید؛ برای توقف دوباره بزنید'
                    : 'تبدیل گفتار به متن (Chrome / Edge)'}
                </TooltipContent>
              </Tooltip>
            </>
          ) : null}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              className={cn(
                'size-11 shrink-0 rounded-full transition-all duration-200',
                canSend
                  ? 'bg-emerald-600 text-white shadow-md hover:bg-emerald-500 hover:scale-[1.03] active:scale-[0.97]'
                  : 'bg-muted text-muted-foreground'
              )}
              disabled={!canSend}
              onClick={onSubmit}
              aria-label="ارسال و ادامه با هوش مصنوعی"
            >
              {isSubmitting ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <ArrowUp className="size-5" strokeWidth={2.5} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            ارسال و ادامه با هوش مصنوعی
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

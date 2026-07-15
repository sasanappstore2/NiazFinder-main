'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  MessageSquare,
  PhoneCall,
  PhoneIncoming,
  Clock,
  Maximize2,
  Minimize2,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAppRouter } from '@/hooks/use-router';
import { acceptIncomingCall, rejectIncomingCall } from '@/lib/voice/call-controller';
import {
  isNativeAudioAvailable,
  setNativeAudioRoute,
} from '@/lib/voice/native-audio-route';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { VoiceCallPeer } from '@/lib/voice/voice-call-peer';
import { useVoiceCallFloatWrapClass } from '@/hooks/use-voice-call-float';
import { toPersianDigits } from '@/lib/format/digits';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface VoiceCallOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: VoiceCallPeer | null;
  callType: 'incoming' | 'outgoing';
}

type CallState = 'ringing' | 'active' | 'ended';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-violet-500',
    'bg-cyan-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-pink-500',
  ];
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  return parts[0].slice(0, 2);
};

const formatDuration = (seconds: number): string => {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return toPersianDigits(
    `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  );
};

const getTargetDisplayName = (user: VoiceCallPeer): string =>
  user.displayName || `${user.firstName} ${user.lastName}`.trim() || 'کاربر';

// ═══════════════════════════════════════════════════════════════════════════════
// RINGING AVATAR
// ═══════════════════════════════════════════════════════════════════════════════

function RingingAvatar({ user }: { user: VoiceCallPeer }) {
  const name = getTargetDisplayName(user);
  const initials = getInitials(name);
  const color = getAvatarColor(name);

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulsing ring 1 */}
      <motion.div
        className="absolute h-44 w-44 rounded-full border-2 border-emerald-400/40 sm:h-52 sm:w-52"
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Outer pulsing ring 2 */}
      <motion.div
        className="absolute h-36 w-36 rounded-full border-2 border-emerald-400/50 sm:h-44 sm:w-44"
        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
      {/* Inner pulsing ring */}
      <motion.div
        className="absolute h-28 w-28 rounded-full border-2 border-emerald-400/60 sm:h-36 sm:w-36"
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 0, 0.7] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      {/* Avatar */}
      <motion.div
        className={cn(
          'relative z-10 flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg sm:h-32 sm:w-32 sm:text-3xl',
          color
        )}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {initials}
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INCOMING CALL OVERLAY
// ═══════════════════════════════════════════════════════════════════════════════

function IncomingCallBar({
  targetUser,
  onAccept,
  onDecline,
  onExpand,
  actionPending,
}: {
  targetUser: VoiceCallPeer;
  onAccept: () => void;
  onDecline: () => void;
  onExpand: () => void;
  actionPending: 'accept' | 'reject' | null;
}) {
  const floatWrapClass = useVoiceCallFloatWrapClass();
  const name = getTargetDisplayName(targetUser);
  const initials = getInitials(name);
  const color = getAvatarColor(name);

  return (
    <motion.div
      className={floatWrapClass}
      initial={{ opacity: 0, y: 80 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 80 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="pointer-events-auto flex w-full max-w-lg items-center gap-2 rounded-2xl border border-emerald-500/30 bg-black/75 px-3 py-3 shadow-2xl backdrop-blur-xl sm:gap-3 sm:px-4 sm:py-3.5">
        <button
          type="button"
          onClick={onExpand}
          className="flex min-w-0 flex-1 items-center gap-3 text-right transition-opacity hover:opacity-90"
          aria-label={`تماس ورودی از ${name}`}
        >
          <div className="relative shrink-0">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white sm:h-11 sm:w-11',
                color
              )}
            >
              {initials}
            </div>
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-black/70 bg-emerald-400" />
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-sm font-semibold text-white">{name}</span>
            <span className="flex items-center gap-1 text-xs text-emerald-300">
              <PhoneIncoming className="h-3 w-3" />
              تماس ورودی
            </span>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <Button
            type="button"
            onClick={onExpand}
            size="sm"
            variant="ghost"
            className="h-9 w-9 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="تمام‌صفحه"
            title="تمام‌صفحه"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            onClick={onAccept}
            disabled={actionPending !== null}
            size="sm"
            className="h-9 w-9 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
            aria-label="پذیرش"
            title="پذیرش"
          >
            {actionPending === 'accept' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            onClick={onDecline}
            disabled={actionPending !== null}
            size="sm"
            className="h-9 w-9 rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
            aria-label="رد"
            title="رد"
          >
            {actionPending === 'reject' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PhoneOff className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function IncomingCallFullscreenView({
  targetUser,
  onAccept,
  onDecline,
  onMessage,
  onMinimize,
  actionPending,
}: {
  targetUser: VoiceCallPeer;
  onAccept: () => void;
  onDecline: () => void;
  onMessage: () => void;
  onMinimize: () => void;
  actionPending: 'accept' | 'reject' | null;
}) {
  const name = getTargetDisplayName(targetUser);

  return (
    <motion.div
      className="fixed inset-0 z-[var(--z-voice-call)] flex flex-col bg-black/80 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-teal-500/15 blur-3xl" />
      </div>

      <div className="relative z-10 flex items-center justify-between px-4 pt-4 sm:px-6">
        <Badge className="gap-1.5 rounded-full border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">
          <PhoneIncoming className="h-3 w-3" />
          تماس ورودی
        </Badge>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onMinimize}
          className="h-10 w-10 rounded-full text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="کوچک کردن"
          title="کوچک کردن"
        >
          <Minimize2 className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-4 sm:gap-8">
        <RingingAvatar user={targetUser} />
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{name}</h2>
          <motion.p
            className="flex items-center gap-2 text-base text-white/60"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            در حال تماس...
          </motion.p>
        </div>

        <div className="flex items-center gap-6 sm:gap-10">
          <div className="flex flex-col items-center gap-2">
            <Button
              onClick={onMessage}
              disabled={actionPending !== null}
              size="lg"
              className="h-16 w-16 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 disabled:opacity-50"
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
            <span className="text-xs text-white/50">پیام</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button
              onClick={onAccept}
              disabled={actionPending !== null}
              size="lg"
              className="h-20 w-20 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 disabled:opacity-50"
            >
              {actionPending === 'accept' ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <Phone className="h-7 w-7" />
              )}
            </Button>
            <span className="text-xs font-medium text-emerald-400">پذیرش</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button
              onClick={onDecline}
              disabled={actionPending !== null}
              size="lg"
              className="h-16 w-16 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600 disabled:opacity-50"
            >
              {actionPending === 'reject' ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <PhoneOff className="h-6 w-6" />
              )}
            </Button>
            <span className="text-xs text-white/50">رد</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVE CALL BAR
// ═══════════════════════════════════════════════════════════════════════════════

function ActiveCallBar({
  targetUser,
  duration,
  isMuted,
  isSpeakerOn,
  onToggleMute,
  onToggleSpeaker,
  onHangup,
  onExpand,
  subtitle,
}: {
  targetUser: VoiceCallPeer;
  duration: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onHangup: () => void;
  onExpand: () => void;
  subtitle?: string;
}) {
  const floatWrapClass = useVoiceCallFloatWrapClass();
  const name = getTargetDisplayName(targetUser);
  const initials = getInitials(name);
  const color = getAvatarColor(name);

  return (
    <motion.div
      className={floatWrapClass}
      initial={{ opacity: 0, y: 80 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 80 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-2xl border border-white/15 bg-black/70 px-4 py-3 shadow-2xl backdrop-blur-xl sm:gap-4 sm:px-5 sm:py-3.5">
        <button
          type="button"
          onClick={onExpand}
          className="flex min-w-0 flex-1 items-center gap-3 text-right transition-opacity hover:opacity-90"
          aria-label={`تماس با ${name} — باز کردن تمام‌صفحه`}
        >
          <div className="relative shrink-0">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white sm:h-11 sm:w-11 sm:text-base',
                color
              )}
            >
              {initials}
            </div>
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-black/70 bg-emerald-400" />
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-sm font-semibold text-white">{name}</span>
            <div className="flex items-center gap-1.5">
              {subtitle ? (
                <span className="text-xs text-amber-300">{subtitle}</span>
              ) : (
                <>
                  <Clock className="h-3 w-3 text-emerald-400" />
                  <span className="text-xs text-emerald-400 tabular-nums">
                    {formatDuration(duration)}
                  </span>
                </>
              )}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            onClick={onExpand}
            size="sm"
            variant="ghost"
            className="h-9 w-9 rounded-full text-white/70 transition-all hover:bg-white/10 hover:text-white"
            aria-label="تمام‌صفحه"
            title="تمام‌صفحه"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            onClick={onToggleMute}
            size="sm"
            variant="ghost"
            className={cn(
              'h-9 w-9 rounded-full text-white/70 transition-all hover:bg-white/10 hover:text-white',
              isMuted && 'bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-400'
            )}
            aria-label={isMuted ? 'روشن کردن میکروفون' : 'قطع میکروفون'}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          <Button
            type="button"
            onClick={onToggleSpeaker}
            size="sm"
            variant="ghost"
            className={cn(
              'h-9 w-9 rounded-full text-white/70 transition-all hover:bg-white/10 hover:text-white',
              isSpeakerOn && 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-400'
            )}
            aria-label={isSpeakerOn ? 'خاموش کردن بلندگو' : 'بلندگو'}
          >
            <Volume2 className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            onClick={onHangup}
            size="sm"
            className="h-9 w-9 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/25 transition-all hover:bg-red-600 hover:shadow-red-500/40"
            aria-label="قطع تماس"
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVE CALL — FULLSCREEN
// ═══════════════════════════════════════════════════════════════════════════════

function ActiveCallFullscreenView({
  targetUser,
  duration,
  isMuted,
  isSpeakerOn,
  onToggleMute,
  onToggleSpeaker,
  onHangup,
  onMinimize,
  subtitle,
  connecting = false,
}: {
  targetUser: VoiceCallPeer;
  duration: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onHangup: () => void;
  onMinimize: () => void;
  subtitle?: string;
  connecting?: boolean;
}) {
  const name = getTargetDisplayName(targetUser);

  return (
    <motion.div
      className="fixed inset-0 z-[var(--z-voice-call)] flex flex-col bg-black/80 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-teal-500/15 blur-3xl" />
      </div>

      <div className="relative z-10 flex items-center justify-between px-4 pt-4 sm:px-6">
        <Badge className="gap-1.5 rounded-full border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">
          <Phone className="h-3 w-3" />
          {connecting ? 'در حال اتصال' : 'تماس فعال'}
        </Badge>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onMinimize}
          className="h-10 w-10 rounded-full text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="کوچک کردن"
          title="کوچک کردن"
        >
          <Minimize2 className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-10 sm:gap-8">
        {connecting ? (
          <RingingAvatar user={targetUser} />
        ) : (
          <div className="relative">
            <div
              className={cn(
                'flex h-28 w-28 items-center justify-center rounded-full text-3xl font-bold text-white shadow-xl sm:h-36 sm:w-36 sm:text-4xl',
                getAvatarColor(name)
              )}
            >
              {getInitials(name)}
            </div>
            <span className="absolute -right-1 -top-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-400" />
            </span>
          </div>
        )}

        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{name}</h2>
          {subtitle ? (
            <motion.p
              className="flex items-center gap-2 text-base text-amber-300"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {subtitle}
            </motion.p>
          ) : (
            <p className="flex items-center gap-2 text-lg text-emerald-400 tabular-nums">
              <Clock className="h-4 w-4" />
              {formatDuration(duration)}
            </p>
          )}
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center gap-8 px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:gap-12">
        <div className="flex flex-col items-center gap-2">
          <Button
            type="button"
            onClick={onToggleMute}
            size="lg"
            className={cn(
              'h-16 w-16 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20',
              isMuted && 'border-red-400/40 bg-red-500/25 text-red-300'
            )}
            aria-label={isMuted ? 'روشن کردن میکروفون' : 'قطع میکروفون'}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          <span className="text-xs text-white/50">میکروفون</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <motion.div whileTap={{ scale: 0.92 }}>
            <Button
              type="button"
              onClick={onHangup}
              size="lg"
              className="h-20 w-20 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 transition-all hover:bg-red-600"
              aria-label="قطع تماس"
            >
              <PhoneOff className="h-7 w-7" />
            </Button>
          </motion.div>
          <span className="text-xs font-medium text-red-400">قطع</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Button
            type="button"
            onClick={onToggleSpeaker}
            size="lg"
            className={cn(
              'h-16 w-16 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20',
              isSpeakerOn && 'border-emerald-400/40 bg-emerald-500/25 text-emerald-300'
            )}
            aria-label={isSpeakerOn ? 'خاموش کردن بلندگو' : 'بلندگو'}
          >
            <Volume2 className="h-6 w-6" />
          </Button>
          <span className="text-xs text-white/50">بلندگو</span>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALL ENDED VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function CallEndedView({
  targetUser,
  duration,
  onCallBack,
}: {
  targetUser: VoiceCallPeer;
  duration: number;
  onCallBack: () => void;
}) {
  const floatWrapClass = useVoiceCallFloatWrapClass();
  const name = getTargetDisplayName(targetUser);
  const initials = getInitials(name);
  const color = getAvatarColor(name);

  return (
    <motion.div
      className={floatWrapClass}
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <motion.div
        className="pointer-events-auto flex w-full max-w-md items-center gap-4 rounded-2xl border border-border/40 bg-card/80 px-5 py-4 shadow-xl backdrop-blur-xl sm:gap-5"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white',
              color,
              'opacity-60'
            )}
          >
            {initials}
          </div>
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20">
            <PhoneOff className="h-4 w-4 text-white" />
          </div>
        </div>

        {/* Call info */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm font-semibold">{name}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">تماس خاتمه یافت</span>
            {duration > 0 && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDuration(duration)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Call back */}
        <Button
          onClick={onCallBack}
          size="sm"
          className="shrink-0 gap-1.5 rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-600 hover:shadow-emerald-500/40"
        >
          <PhoneCall className="h-3.5 w-3.5" />
          <span className="text-xs">تماس مجدد</span>
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function VoiceCallOverlay({
  isOpen,
  onClose,
  targetUser,
  callType,
}: VoiceCallOverlayProps) {
  const { push } = useAppRouter();
  const voiceCallStatus = useAppStore((s) => s.voiceCallStatus);
  const duration = useAppStore((s) => s.voiceCallDuration);
  const isMuted = useAppStore((s) => s.voiceCallMuted);
  const hangupVoiceCall = useAppStore((s) => s.hangupVoiceCall);
  const toggleVoiceCallMute = useAppStore((s) => s.toggleVoiceCallMute);
  const openVoiceCall = useAppStore((s) => s.openVoiceCall);

  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionPending, setActionPending] = useState<'accept' | 'reject' | null>(null);

  const callState: CallState =
    voiceCallStatus === 'idle' ? 'ended' : (voiceCallStatus as CallState);

  useEffect(() => {
    if (!isOpen || callState === 'ended') {
      setIsExpanded(false);
    }
  }, [isOpen, callState]);

  // Native app: call audio starts on the earpiece (real phone-call behavior);
  // plain mobile web has no earpiece routing, so the speaker is the reality.
  useEffect(() => {
    if (callState === 'active') {
      setIsSpeakerOn(!isNativeAudioAvailable());
    }
  }, [callState]);

  const handleToggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => {
      const next = !prev;
      if (isNativeAudioAvailable()) {
        void setNativeAudioRoute(next ? 'speaker' : 'earpiece');
      }
      return next;
    });
  }, []);

  const handleExpand = useCallback(() => setIsExpanded(true), []);
  const handleMinimize = useCallback(() => setIsExpanded(false), []);

  const handleAccept = useCallback(async () => {
    if (actionPending) return;
    setActionPending('accept');
    try {
      await acceptIncomingCall();
    } finally {
      setActionPending(null);
    }
  }, [actionPending]);

  const handleDecline = useCallback(async () => {
    if (actionPending) return;
    setActionPending('reject');
    try {
      await rejectIncomingCall();
    } finally {
      setActionPending(null);
    }
  }, [actionPending]);

  const handleHangup = useCallback(() => {
    hangupVoiceCall();
  }, [hangupVoiceCall]);

  const handleMessage = useCallback(async () => {
    if (actionPending) return;
    setActionPending('reject');
    try {
      await rejectIncomingCall();
    } finally {
      setActionPending(null);
    }
    setTimeout(() => {
      onClose();
      if (targetUser) push('messages');
    }, 300);
  }, [actionPending, onClose, push, targetUser]);

  const handleCallBack = useCallback(() => {
    if (targetUser) openVoiceCall(targetUser);
  }, [openVoiceCall, targetUser]);

  if (!isOpen || !targetUser) return null;

  return (
    <>
      <audio id="voice-call-remote-audio" autoPlay playsInline className="hidden" />
      <AnimatePresence mode="wait">
        {callState === 'ringing' && callType === 'incoming' &&
          (isExpanded ? (
            <IncomingCallFullscreenView
              key="incoming-full"
              targetUser={targetUser}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onMessage={handleMessage}
              onMinimize={handleMinimize}
              actionPending={actionPending}
            />
          ) : (
            <IncomingCallBar
              key="incoming-bar"
              targetUser={targetUser}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onExpand={handleExpand}
              actionPending={actionPending}
            />
          ))}

        {callState === 'ringing' && callType === 'outgoing' &&
          (isExpanded ? (
            <ActiveCallFullscreenView
              key="outgoing-ring-full"
              targetUser={targetUser}
              duration={0}
              isMuted={isMuted}
              isSpeakerOn={isSpeakerOn}
              onToggleMute={toggleVoiceCallMute}
              onToggleSpeaker={handleToggleSpeaker}
              onHangup={handleHangup}
              onMinimize={handleMinimize}
              subtitle="در حال برقراری تماس..."
              connecting
            />
          ) : (
            <ActiveCallBar
              key="outgoing-ring"
              targetUser={targetUser}
              duration={0}
              isMuted={isMuted}
              isSpeakerOn={isSpeakerOn}
              onToggleMute={toggleVoiceCallMute}
              onToggleSpeaker={handleToggleSpeaker}
              onHangup={handleHangup}
              onExpand={handleExpand}
              subtitle="در حال برقراری تماس..."
            />
          ))}

        {callState === 'active' &&
          (isExpanded ? (
            <ActiveCallFullscreenView
              key="active-full"
              targetUser={targetUser}
              duration={duration}
              isMuted={isMuted}
              isSpeakerOn={isSpeakerOn}
              onToggleMute={toggleVoiceCallMute}
              onToggleSpeaker={handleToggleSpeaker}
              onHangup={handleHangup}
              onMinimize={handleMinimize}
            />
          ) : (
            <ActiveCallBar
              key="active"
              targetUser={targetUser}
              duration={duration}
              isMuted={isMuted}
              isSpeakerOn={isSpeakerOn}
              onToggleMute={toggleVoiceCallMute}
              onToggleSpeaker={handleToggleSpeaker}
              onHangup={handleHangup}
              onExpand={handleExpand}
            />
          ))}

        {callState === 'ended' && (
          <CallEndedView
            key="ended"
            targetUser={targetUser}
            duration={duration}
            onCallBack={handleCallBack}
          />
        )}
      </AnimatePresence>
    </>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAppRouter } from '@/hooks/use-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface VoiceCallOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: User | null;
  callType: 'incoming' | 'outgoing';
}

type CallState = 'ringing' | 'active' | 'ended';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const toPersianDigits = (str: string): string =>
  str.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);

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

const getTargetDisplayName = (user: User): string =>
  user.displayName || `${user.firstName} ${user.lastName}`.trim() || 'کاربر';

// ═══════════════════════════════════════════════════════════════════════════════
// RINGING AVATAR
// ═══════════════════════════════════════════════════════════════════════════════

function RingingAvatar({ user }: { user: User }) {
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

function IncomingCallView({
  targetUser,
  onAccept,
  onDecline,
  onMessage,
}: {
  targetUser: User;
  onAccept: () => void;
  onDecline: () => void;
  onMessage: () => void;
}) {
  const name = getTargetDisplayName(targetUser);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-black/60 backdrop-blur-xl sm:gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-teal-500/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-4 sm:gap-8">
        {/* Caller type badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Badge className="gap-1.5 rounded-full border-emerald-500/30 bg-emerald-500/15 px-4 py-1.5 text-sm text-emerald-300 backdrop-blur-sm">
            <PhoneIncoming className="h-3.5 w-3.5" />
            تماس ورودی
          </Badge>
        </motion.div>

        {/* Ringing avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <RingingAvatar user={targetUser} />
        </motion.div>

        {/* Caller name */}
        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
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
        </motion.div>

        {/* Action buttons */}
        <motion.div
          className="flex items-center gap-6 sm:gap-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Message button */}
          <div className="flex flex-col items-center gap-2">
            <Button
              onClick={onMessage}
              size="lg"
              className="h-16 w-16 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
            <span className="text-xs text-white/50">پیام</span>
          </div>

          {/* Accept button */}
          <div className="flex flex-col items-center gap-2">
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                onClick={onAccept}
                size="lg"
                className="h-20 w-20 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-600 hover:shadow-emerald-500/50 hover:scale-105 active:scale-95"
              >
                <Phone className="h-7 w-7" />
              </Button>
            </motion.div>
            <span className="text-xs font-medium text-emerald-400">پذیرش</span>
          </div>

          {/* Decline button */}
          <div className="flex flex-col items-center gap-2">
            <Button
              onClick={onDecline}
              size="lg"
              className="h-16 w-16 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600 hover:shadow-red-500/40 hover:scale-105 active:scale-95"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <span className="text-xs text-white/50">رد</span>
          </div>
        </motion.div>
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
}: {
  targetUser: User;
  duration: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onHangup: () => void;
}) {
  const name = getTargetDisplayName(targetUser);
  const initials = getInitials(name);
  const color = getAvatarColor(name);

  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center px-4 pt-4"
      initial={{ opacity: 0, y: -80 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -80 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="flex w-full max-w-lg items-center gap-3 rounded-2xl border border-white/15 bg-black/70 px-4 py-3 shadow-2xl backdrop-blur-xl sm:gap-4 sm:px-5 sm:py-3.5">
        {/* Caller avatar (compact) */}
        <div className="relative shrink-0">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white sm:h-11 sm:w-11 sm:text-base',
              color
            )}
          >
            {initials}
          </div>
          {/* Live pulse indicator */}
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-black/70 bg-emerald-400" />
          </span>
        </div>

        {/* Call info */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold text-white">{name}</span>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-emerald-400" />
            <span className="text-xs text-emerald-400 tabular-nums">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mute */}
          <Button
            onClick={onToggleMute}
            size="sm"
            variant="ghost"
            className={cn(
              'h-9 w-9 rounded-full text-white/70 transition-all hover:bg-white/10 hover:text-white',
              isMuted && 'bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-400'
            )}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          {/* Speaker */}
          <Button
            onClick={onToggleSpeaker}
            size="sm"
            variant="ghost"
            className={cn(
              'h-9 w-9 rounded-full text-white/70 transition-all hover:bg-white/10 hover:text-white',
              isSpeakerOn && 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-400'
            )}
          >
            <Volume2 className="h-4 w-4" />
          </Button>

          {/* Hang up */}
          <Button
            onClick={onHangup}
            size="sm"
            className="h-9 w-9 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/25 transition-all hover:bg-red-600 hover:shadow-red-500/40"
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
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
  targetUser: User;
  duration: number;
  onCallBack: () => void;
}) {
  const name = getTargetDisplayName(targetUser);
  const initials = getInitials(name);
  const color = getAvatarColor(name);

  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center px-4 pt-4"
      initial={{ opacity: 0, y: -60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -60 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <motion.div
        className="flex w-full max-w-md items-center gap-4 rounded-2xl border border-border/40 bg-card/80 px-5 py-4 shadow-xl backdrop-blur-xl sm:gap-5"
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

  // ─── Call state ───────────────────────────────────────────────────────
  const [callState, setCallState] = useState<CallState>('ringing');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Start duration timer ─────────────────────────────────────────────
  const startDurationTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  // ─── Stop duration timer ──────────────────────────────────────────────
  const stopDurationTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ─── Sync state when props change ──────────────────────────────────
  const prevIsOpenRef = useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      // isOpen changed from false to true — reset call state
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional state reset when overlay opens
      setCallState('ringing'); setDuration(0); setIsMuted(false); setIsSpeakerOn(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);

      // For outgoing calls, auto-answer after a brief delay (simulated)
      if (callType === 'outgoing') {
        const autoAnswerTimer = setTimeout(() => {
          setCallState('active');
          startDurationTimer();
        }, 2500);
        return () => clearTimeout(autoAnswerTimer);
      }
    }
    prevIsOpenRef.current = isOpen;

    // Cleanup on close
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    };
  }, [isOpen, callType, startDurationTimer, stopDurationTimer]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    };
  }, []);

  // ─── Accept call ──────────────────────────────────────────────────────
  const handleAccept = useCallback(() => {
    setCallState('active');
    startDurationTimer();
  }, [startDurationTimer]);

  // ─── Decline call ─────────────────────────────────────────────────────
  const handleDecline = useCallback(() => {
    setCallState('ended');
    stopDurationTimer();
  }, [stopDurationTimer]);

  // ─── Hang up ──────────────────────────────────────────────────────────
  const handleHangup = useCallback(() => {
    setCallState('ended');
    stopDurationTimer();
  }, [stopDurationTimer]);

  // ─── Message (go to chat) ─────────────────────────────────────────────
  const handleMessage = useCallback(() => {
    setCallState('ended');
    stopDurationTimer();
    // Brief delay then navigate to chat
    setTimeout(() => {
      onClose();
      push('messages');
    }, 300);
  }, [stopDurationTimer, onClose, push]);

  // ─── Call back ────────────────────────────────────────────────────────
  const handleCallBack = useCallback(() => {
    setCallState('ringing');
    // Auto-answer after a brief delay (simulated)
    const autoAnswer = setTimeout(() => {
      setCallState('active');
      startDurationTimer();
    }, 2000);
    return () => clearTimeout(autoAnswer);
  }, [startDurationTimer]);

  // ─── Toggle mute ──────────────────────────────────────────────────────
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // ─── Toggle speaker ───────────────────────────────────────────────────
  const handleToggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev);
  }, []);

  // ─── Auto-dismiss ended call after 5 seconds ─────────────────────────
  useEffect(() => {
    if (callState === 'ended') {
      autoDismissRef.current = setTimeout(() => {
        onClose();
      }, 5000);
      return () => {
        if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
      };
    }
  }, [callState, onClose]);

  // ─── Don't render if not open or no target user ───────────────────────
  if (!isOpen || !targetUser) return null;

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      {callState === 'ringing' && (
        <IncomingCallView
          key="incoming"
          targetUser={targetUser}
          onAccept={handleAccept}
          onDecline={handleDecline}
          onMessage={handleMessage}
        />
      )}

      {callState === 'active' && (
        <ActiveCallBar
          key="active"
          targetUser={targetUser}
          duration={duration}
          isMuted={isMuted}
          isSpeakerOn={isSpeakerOn}
          onToggleMute={handleToggleMute}
          onToggleSpeaker={handleToggleSpeaker}
          onHangup={handleHangup}
        />
      )}

      {callState === 'ended' && (
        <CallEndedView
          key="ended"
          targetUser={targetUser}
          duration={duration}
          onCallBack={handleCallBack}
        />
      )}
    </AnimatePresence>
  );
}

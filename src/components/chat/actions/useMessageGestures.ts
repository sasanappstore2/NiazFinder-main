'use client';

import { useCallback, useRef, type MouseEvent, type TouchEventHandler } from 'react';
import { useMotionValue, useTransform, animate } from 'framer-motion';
import {
  CHAT_DOUBLE_TAP_MS,
  CHAT_LONG_PRESS_MS,
  CHAT_SWIPE_AXIS_LOCK_PX,
  CHAT_SWIPE_MAX_PX,
  CHAT_SWIPE_REPLY_THRESHOLD_PX,
  CHAT_TOUCH_MOVE_CANCEL_PX,
} from '@/lib/chat/ui/tokens';

export function useMessageGestures(options: {
  disabled?: boolean;
  onReply: () => void;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  touchActionsEnabled?: boolean;
}) {
  const { disabled, onReply, onLongPress, onDoubleTap, touchActionsEnabled = false } =
    options;
  const dragX = useMotionValue(0);
  const replyIconOpacity = useTransform(
    dragX,
    [0, -36, -CHAT_SWIPE_REPLY_THRESHOLD_PX],
    [0, 0.45, 1]
  );

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapAtRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const longPressFiredRef = useRef(false);
  const suppressClickUntilRef = useRef(0);
  /** null = undecided, true = horizontal swipe-reply, false = vertical scroll */
  const axisLockRef = useRef<boolean | null>(null);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    const x = dragX.get();
    if (x <= -CHAT_SWIPE_REPLY_THRESHOLD_PX && !disabled) {
      onReply();
    }
    animate(dragX, 0, { type: 'spring', stiffness: 420, damping: 32 });
    axisLockRef.current = null;
  }, [disabled, dragX, onReply]);

  const handleTouchStart: TouchEventHandler = useCallback(
    (e) => {
      if (disabled || !touchActionsEnabled) return;
      const touch = e.touches[0];
      if (!touch) return;

      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      longPressFiredRef.current = false;
      axisLockRef.current = null;
      clearLongPressTimer();

      if (!onLongPress) return;
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        longPressFiredRef.current = true;
        onLongPress();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(12);
        }
      }, CHAT_LONG_PRESS_MS);
    },
    [clearLongPressTimer, disabled, onLongPress, touchActionsEnabled]
  );

  const handleTouchMove: TouchEventHandler = useCallback(
    (e) => {
      if (!touchStartRef.current || disabled || !touchActionsEnabled) return;
      const touch = e.touches[0];
      if (!touch) return;

      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (axisLockRef.current === null) {
        if (absDx > CHAT_SWIPE_AXIS_LOCK_PX || absDy > CHAT_SWIPE_AXIS_LOCK_PX) {
          axisLockRef.current = absDx > absDy;
        }
      }

      if (absDx > CHAT_TOUCH_MOVE_CANCEL_PX || absDy > CHAT_TOUCH_MOVE_CANCEL_PX) {
        clearLongPressTimer();
      }
    },
    [clearLongPressTimer, disabled, touchActionsEnabled]
  );

  const handleTouchEnd: TouchEventHandler = useCallback(
    (e) => {
      clearLongPressTimer();
      axisLockRef.current = null;

      if (disabled || !touchActionsEnabled || longPressFiredRef.current) {
        touchStartRef.current = null;
        return;
      }

      if (onDoubleTap) {
        const now = Date.now();
        if (now - lastTapAtRef.current <= CHAT_DOUBLE_TAP_MS) {
          lastTapAtRef.current = 0;
          suppressClickUntilRef.current = Date.now() + 400;
          e.preventDefault();
          onDoubleTap();
          touchStartRef.current = null;
          return;
        }
        lastTapAtRef.current = now;
      }

      touchStartRef.current = null;
    },
    [clearLongPressTimer, disabled, onDoubleTap, touchActionsEnabled]
  );

  const handleTouchCancel: TouchEventHandler = useCallback(() => {
    clearLongPressTimer();
    touchStartRef.current = null;
    longPressFiredRef.current = false;
    axisLockRef.current = null;
  }, [clearLongPressTimer]);

  const handleClickCapture = useCallback((e: MouseEvent) => {
    if (Date.now() < suppressClickUntilRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return {
    dragX,
    replyIconOpacity,
    handleDragEnd,
    dragProps: disabled
      ? { drag: false as const }
      : {
          drag: 'x' as const,
          dragConstraints: { left: -CHAT_SWIPE_MAX_PX, right: 0 },
          dragElastic: 0.12,
          dragMomentum: false,
          dragDirectionLock: true,
          onDragStart: () => {
            // Prefer vertical scroll until horizontal intent is clear.
            if (axisLockRef.current === false) {
              dragX.set(0);
            }
          },
        },
    touchProps: touchActionsEnabled
      ? {
          onTouchStart: handleTouchStart,
          onTouchMove: handleTouchMove,
          onTouchEnd: handleTouchEnd,
          onTouchCancel: handleTouchCancel,
          onClickCapture: handleClickCapture,
        }
      : {},
  };
}

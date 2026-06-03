import type { CSSProperties } from 'react';
import {
  CHAT_BUBBLE_RADIUS_PX,
  CHAT_BUBBLE_TAIL_RADIUS_PX,
} from '@/lib/chat/ui/tokens';

export type BubbleSide = 'sent' | 'received';
export type BubbleGroupSlot = 'single' | 'first' | 'middle' | 'last';

export type BubbleGroupPosition = {
  isFirst: boolean;
  isLast: boolean;
  isSingle: boolean;
};

export function toBubbleGroupSlot(group: BubbleGroupPosition): BubbleGroupSlot {
  if (group.isSingle) return 'single';
  if (group.isFirst && !group.isLast) return 'first';
  if (!group.isFirst && !group.isLast) return 'middle';
  return 'last';
}

const R = CHAT_BUBBLE_RADIUS_PX;
const T = CHAT_BUBBLE_TAIL_RADIUS_PX;
/** شعاع اتصال بین پیام‌های پیاپی یک فرستنده */
const JOIN = 10;

/**
 * گوشه‌های خوشه‌ای — دم روی لبهٔ بیرونی پایین (RTL: راست=ارسال، چپ=دریافت).
 */
export function getBubbleRadiusStyle(side: BubbleSide, slot: BubbleGroupSlot = 'single'): CSSProperties {
  if (side === 'sent') {
    switch (slot) {
      case 'first':
        return {
          borderRadius: R,
          borderBottomRightRadius: JOIN,
        };
      case 'middle':
        return {
          borderRadius: R,
          borderTopRightRadius: JOIN,
          borderBottomRightRadius: JOIN,
        };
      case 'last':
        return {
          borderRadius: R,
          borderTopRightRadius: JOIN,
          borderBottomRightRadius: T,
        };
      default:
        return { borderRadius: R, borderBottomRightRadius: T };
    }
  }

  switch (slot) {
    case 'first':
      return {
        borderRadius: R,
        borderBottomLeftRadius: JOIN,
      };
    case 'middle':
      return {
        borderRadius: R,
        borderTopLeftRadius: JOIN,
        borderBottomLeftRadius: JOIN,
      };
    case 'last':
      return {
        borderRadius: R,
        borderTopLeftRadius: JOIN,
        borderBottomLeftRadius: T,
      };
    default:
      return { borderRadius: R, borderBottomLeftRadius: T };
  }
}

export function bubbleGroupClassName(slot: BubbleGroupSlot): string {
  return `chat-bubble--${slot}`;
}

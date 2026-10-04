import type { Metadata, Viewport } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { ChatViewportShell } from '@/components/chat/ChatViewportShell';

export const metadata: Metadata = {
  title: 'نیاز فایندر - پیام‌ها',
  description: 'گفتگوی آنلاین با متخصصان و کارفرمایان',
};

/**
 * Keyboard overlays content; ChatViewportShell sizes to visualViewport.
 * Avoids Chrome Android auto-resizing the layout under the keyboard.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'overlays-content',
};

/**
 * Chat is a single-viewport app shell: page never scrolls;
 * only the conversation list and thread ScrollAreas scroll.
 * ChatViewportShell tracks visualViewport (no double keyboard inset).
 */
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell minimalChrome>
      <ChatViewportShell>{children}</ChatViewportShell>
    </AppShell>
  );
}

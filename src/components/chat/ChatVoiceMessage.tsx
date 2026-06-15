'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import { ChatReadReceiptIcon } from '@/components/chat/bubble/ChatReadReceiptIcon';
import { cn } from '@/lib/utils';
import { toPersianDigits } from '@/lib/format/digits';

const BAR_COUNT = 42;

interface ChatVoiceMessageProps {
  url: string;
  isOwn: boolean;
  timeLabel: string;
  isRead?: boolean;
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60)
    .toString()
    .padStart(2, '0');
  const secs = (s % 60).toString().padStart(2, '0');
  return toPersianDigits(`${mins}:${secs}`);
}

function seedWaveform(seed: string, count: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    bars.push(5 + (Math.abs(h) % 18));
  }
  return bars;
}

/** 0→1 fill amount for bar `i` at global progress `p` (smooth crossfade between bars). */
function barFillAt(i: number, p: number, count: number): number {
  const start = i / count;
  const end = (i + 1) / count;
  if (p <= start) return 0;
  if (p >= end) return 1;
  const t = (p - start) / (end - start);
  return t * t * (3 - 2 * t);
}

/** WebM from chat storage often reports duration late; seekable/buffered ranges are earlier. */
function resolveDuration(audio: HTMLAudioElement): number {
  const direct = audio.duration;
  if (Number.isFinite(direct) && direct > 0) return direct;
  if (audio.seekable.length > 0) {
    const end = audio.seekable.end(audio.seekable.length - 1);
    if (Number.isFinite(end) && end > 0) return end;
  }
  if (audio.buffered.length > 0) {
    const end = audio.buffered.end(audio.buffered.length - 1);
    if (Number.isFinite(end) && end > 0) return end;
  }
  return 0;
}

function computeProgress(audio: HTMLAudioElement): number {
  const duration = resolveDuration(audio);
  return duration > 0 ? Math.min(1, audio.currentTime / duration) : 0;
}

export function ChatVoiceMessage({ url, isOwn, timeLabel, isRead }: ChatVoiceMessageProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playheadPulse, setPlayheadPulse] = useState(0);

  const waveform = useMemo(() => seedWaveform(url, BAR_COUNT), [url]);

  const syncFromAudio = useCallback((audio: HTMLAudioElement) => {
    const resolved = resolveDuration(audio);
    if (resolved > 0) setDuration(resolved);
    setCurrent(audio.currentTime);
    setProgress(computeProgress(audio));
  }, []);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.preload = 'auto';

    const refreshDuration = () => {
      const resolved = resolveDuration(audio);
      if (resolved > 0) setDuration(resolved);
    };
    const onTime = () => {
      if (audio.paused) syncFromAudio(audio);
    };
    const onEnd = () => {
      setIsPlaying(false);
      setCurrent(0);
      setProgress(0);
    };

    audio.addEventListener('loadedmetadata', refreshDuration);
    audio.addEventListener('durationchange', refreshDuration);
    audio.addEventListener('progress', refreshDuration);
    audio.addEventListener('canplay', refreshDuration);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    void audio.load();

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', refreshDuration);
      audio.removeEventListener('durationchange', refreshDuration);
      audio.removeEventListener('progress', refreshDuration);
      audio.removeEventListener('canplay', refreshDuration);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audioRef.current = null;
    };
  }, [url, syncFromAudio]);

  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio) syncFromAudio(audio);
      setPlayheadPulse(performance.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, syncFromAudio]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      void audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [isPlaying]);

  const seekByClientX = useCallback(
    (clientX: number, rect: DOMRect) => {
      const audio = audioRef.current;
      const resolved = audio ? resolveDuration(audio) : 0;
      if (!audio || resolved <= 0) return;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      audio.currentTime = ratio * resolved;
      syncFromAudio(audio);
    },
    [syncFromAudio]
  );

  const displaySeconds = isPlaying || current > 0 ? current : duration;

  return (
    <div
      className={cn(
        'w-[min(78vw,268px)] min-w-[220px] select-none',
        isOwn ? 'text-primary-foreground' : 'text-foreground'
      )}
      dir="ltr"
    >
      <div className="flex items-start gap-2.5">
        <motion.button
          type="button"
          onClick={togglePlay}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
          className={cn(
            'mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full shadow-sm',
            isOwn
              ? 'bg-white text-primary hover:bg-white/95'
              : 'bg-white text-emerald-600 hover:bg-white/95 dark:bg-zinc-100'
          )}
          aria-label={isPlaying ? 'توقف' : 'پخش پیام صوتی'}
        >
          <motion.span
            key={isPlaying ? 'pause' : 'play'}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
          >
            {isPlaying ? (
              <Pause className="size-4 fill-current" />
            ) : (
              <Play className="size-4 fill-current ms-0.5" />
            )}
          </motion.span>
        </motion.button>

        <div className="min-w-0 flex-1">
          <motion.div
            className="relative flex h-8 cursor-pointer items-end gap-[2px] px-0.5"
            role="slider"
            aria-label="پیشرفت پخش"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={current}
            tabIndex={0}
            onClick={(e) => seekByClientX(e.clientX, e.currentTarget.getBoundingClientRect())}
            onKeyDown={(e) => {
              const audio = audioRef.current;
              const resolved = audio ? resolveDuration(audio) : 0;
              if (!audio || resolved <= 0) return;
              if (e.key === 'ArrowRight') {
                audio.currentTime = Math.min(resolved, audio.currentTime + 1);
                syncFromAudio(audio);
              }
              if (e.key === 'ArrowLeft') {
                audio.currentTime = Math.max(0, audio.currentTime - 1);
                syncFromAudio(audio);
              }
            }}
          >
            <WaveformBars
              waveform={waveform}
              progress={progress}
              isPlaying={isPlaying}
              playheadPulse={playheadPulse}
              isOwn={isOwn}
            />
          </motion.div>

          <div className="mt-0.5 flex items-center justify-between gap-2 pe-0.5">
            <motion.span
              key={Math.floor(displaySeconds)}
              initial={{ opacity: 0.6, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={cn(
                'text-[11px] font-medium tabular-nums leading-none',
                isOwn ? 'text-white/90' : 'text-muted-foreground'
              )}
            >
              {formatDuration(displaySeconds)}
            </motion.span>
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-[11px] tabular-nums leading-none',
                isOwn ? 'text-white/75' : 'text-muted-foreground'
              )}
            >
              {timeLabel}
              {isOwn && (
                <ChatReadReceiptIcon
                  isRead={isRead}
                  className={cn(
                    'size-3.5 shrink-0',
                    isRead ? 'text-sky-300' : 'text-white/45'
                  )}
                />
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WaveformBars({
  waveform,
  progress,
  isPlaying,
  playheadPulse,
  isOwn,
}: {
  waveform: number[];
  progress: number;
  isPlaying: boolean;
  playheadPulse: number;
  isOwn: boolean;
}) {
  return (
    <>
      {waveform.map((h, i) => {
        const fill = barFillAt(i, progress, BAR_COUNT);
        const isHead = fill > 0.35 && fill < 0.98;
        const pulse =
          isPlaying && isHead ? 1 + 0.14 * Math.sin(playheadPulse / 140 + i * 0.55) : 1;
        const targetH = h * (0.88 + fill * 0.12) * pulse;
        const opacity = 0.28 + fill * 0.72;

        return (
          <motion.div
            key={i}
            className={cn(
              'w-[2px] shrink-0 origin-bottom rounded-full',
              isOwn ? 'bg-white' : 'bg-emerald-500 dark:bg-emerald-400'
            )}
            initial={false}
            animate={{
              height: targetH,
              opacity,
              scaleX: 0.92 + fill * 0.08,
            }}
            transition={{
              height: isPlaying
                ? { duration: 0.06, ease: 'linear' }
                : { type: 'spring', stiffness: 380, damping: 28, mass: 0.25 },
              opacity: { duration: isPlaying ? 0.08 : 0.22, ease: [0.22, 1, 0.36, 1] },
              scaleX: { duration: isPlaying ? 0.06 : 0.18, ease: 'easeOut' },
            }}
          />
        );
      })}
    </>
  );
}

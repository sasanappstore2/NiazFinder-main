'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { CheckCheck, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

const BAR_COUNT = 42;

interface ChatVoiceMessageProps {
  url: string;
  isOwn: boolean;
  timeLabel: string;
  isRead?: boolean;
}

const toPersianDigits = (str: string): string =>
  str.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d, 10)]);

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

export function ChatVoiceMessage({ url, isOwn, timeLabel, isRead }: ChatVoiceMessageProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playheadPulse, setPlayheadPulse] = useState(0);
  const targetProgressRef = useRef(0);

  const progressSpring = useSpring(0, { stiffness: 120, damping: 22, mass: 0.35 });
  const smoothProgress = useTransform(progressSpring, (v) => Math.max(0, Math.min(1, v)));

  const waveform = useMemo(() => seedWaveform(url, BAR_COUNT), [url]);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.preload = 'metadata';

    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onTime = () => {
      setCurrent(audio.currentTime);
      targetProgressRef.current = audio.duration ? audio.currentTime / audio.duration : 0;
      if (audio.paused) {
        progressSpring.set(targetProgressRef.current);
      }
    };
    const onEnd = () => {
      setIsPlaying(false);
      setCurrent(0);
      targetProgressRef.current = 0;
      progressSpring.set(0);
    };

    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audioRef.current = null;
    };
  }, [url, progressSpring]);

  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio?.duration) {
        const p = audio.currentTime / audio.duration;
        targetProgressRef.current = p;
        progressSpring.set(p);
        setCurrent(audio.currentTime);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, progressSpring]);

  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    const pulse = () => {
      setPlayheadPulse(performance.now());
      raf = requestAnimationFrame(pulse);
    };
    raf = requestAnimationFrame(pulse);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

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
      if (!audio?.duration) return;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      audio.currentTime = ratio * audio.duration;
      const p = ratio;
      targetProgressRef.current = p;
      progressSpring.set(p);
      setCurrent(audio.currentTime);
    },
    [progressSpring]
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
              if (!audio?.duration) return;
              if (e.key === 'ArrowRight') {
                audio.currentTime = Math.min(audio.duration, audio.currentTime + 1);
                progressSpring.set(audio.currentTime / audio.duration);
              }
              if (e.key === 'ArrowLeft') {
                audio.currentTime = Math.max(0, audio.currentTime - 1);
                progressSpring.set(audio.currentTime / audio.duration);
              }
            }}
          >
            <WaveformBars
              waveform={waveform}
              smoothProgress={smoothProgress}
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
                <CheckCheck
                  className={cn(
                    'size-3.5 shrink-0',
                    isRead ? 'text-sky-300' : 'text-white/45'
                  )}
                  aria-hidden
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
  smoothProgress,
  isPlaying,
  playheadPulse,
  isOwn,
}: {
  waveform: number[];
  smoothProgress: MotionValue<number>;
  isPlaying: boolean;
  playheadPulse: number;
  isOwn: boolean;
}) {
  const [p, setP] = useState(0);

  useEffect(() => {
    const unsub = smoothProgress.on('change', (v) => setP(v));
    return () => unsub();
  }, [smoothProgress]);

  return (
    <>
      {waveform.map((h, i) => {
        const fill = barFillAt(i, p, BAR_COUNT);
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
              height: { type: 'spring', stiffness: 380, damping: 28, mass: 0.25 },
              opacity: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
              scaleX: { duration: 0.18, ease: 'easeOut' },
            }}
          />
        );
      })}
    </>
  );
}

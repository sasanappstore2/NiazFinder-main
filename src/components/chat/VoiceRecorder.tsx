'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, SendHorizontal, X, Pause, Play, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type VoiceRecorderPhase = 'idle' | 'recording' | 'preview';
export type VoiceRecorderError = 'permission' | 'unsupported' | 'too_short' | 'unknown';

export interface VoiceRecorderHandle {
  startRecording: () => void;
  cancel: () => void;
}

interface VoiceRecorderProps {
  onSend: (blob: Blob, duration: number) => void | Promise<void>;
  onCancel: () => void;
  onPhaseChange?: (phase: VoiceRecorderPhase) => void;
  onError?: (code: VoiceRecorderError) => void;
  /** Hide built-in mic; parent triggers `startRecording` via ref. */
  hideIdle?: boolean;
  disabled?: boolean;
}

const MAX_RECORD_SECONDS = 180;
const MIN_RECORD_SECONDS = 0.4;

const toPersianDigits = (str: string): string =>
  str.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d, 10)]);

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return toPersianDigits(`${mins}:${secs}`);
};

export const VoiceRecorder = forwardRef<VoiceRecorderHandle, VoiceRecorderProps>(
  function VoiceRecorder(
    { onSend, onCancel, onPhaseChange, onError, hideIdle = false, disabled = false },
    ref
  ) {
    const [state, setState] = useState<VoiceRecorderPhase>('idle');
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [totalDuration, setTotalDuration] = useState(0);
    const [waveformHeights, setWaveformHeights] = useState<number[]>([]);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioBlobRef = useRef<Blob | null>(null);
    const audioUrlRef = useRef<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const recordingDurationRef = useRef(0);
    const streamRef = useRef<MediaStream | null>(null);
    const animFrameRef = useRef<number>(0);
    const discardRecordingRef = useRef(false);
    const [previewBars, setPreviewBars] = useState<number[]>([4, 4, 4, 4, 4, 4, 4, 4]);

    const resetToIdle = useCallback(() => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
      audioBlobRef.current = null;
      audioRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
      setWaveformHeights([]);
      setPreviewBars([4, 4, 4, 4, 4, 4, 4, 4]);
      setRecordingDuration(0);
      recordingDurationRef.current = 0;
      setTotalDuration(0);
      setPlaybackTime(0);
      setIsPlaying(false);
      setState('idle');
    }, []);

    useEffect(() => {
      onPhaseChange?.(state);
    }, [state, onPhaseChange]);

    useEffect(() => {
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        audioRef.current?.pause();
      };
    }, []);

    const startRecording = useCallback(async () => {
      if (disabled || state !== 'idle') return;

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        onError?.('unsupported');
        return;
      }

      try {
        discardRecordingRef.current = false;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const barCount = 8;
        const updateWaveform = () => {
          analyser.getByteFrequencyData(dataArray);
          const bars: number[] = [];
          const bandSize = Math.floor(dataArray.length / barCount);
          for (let i = 0; i < barCount; i++) {
            let sum = 0;
            for (let j = 0; j < bandSize; j++) {
              sum += dataArray[i * bandSize + j];
            }
            bars.push(Math.max(4, 4 + (sum / bandSize / 255) * 22));
          }
          setWaveformHeights(bars);
          animFrameRef.current = requestAnimationFrame(updateWaveform);
        };
        updateWaveform();

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : '';

        const mediaRecorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          if (discardRecordingRef.current) {
            discardRecordingRef.current = false;
            stream.getTracks().forEach((t) => t.stop());
            void audioCtx.close();
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            resetToIdle();
            return;
          }

          const chosenType = mediaRecorder.mimeType || 'audio/webm';
          const blob = new Blob(audioChunksRef.current, { type: chosenType });
          if (blob.size < 1 || recordingDurationRef.current < MIN_RECORD_SECONDS) {
            stream.getTracks().forEach((t) => t.stop());
            void audioCtx.close();
            resetToIdle();
            onCancel();
            return;
          }

          audioBlobRef.current = blob;
          if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
          const url = URL.createObjectURL(blob);
          audioUrlRef.current = url;

          const audio = new Audio(url);
          audioRef.current = audio;
          setTotalDuration(recordingDurationRef.current);
          setPlaybackTime(0);
          setIsPlaying(false);

          stream.getTracks().forEach((t) => t.stop());
          void audioCtx.close();
          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
          setWaveformHeights([]);
          setState('preview');
        };

        mediaRecorder.start(100);
        setState('recording');
        setRecordingDuration(0);
        recordingDurationRef.current = 0;

        const startTime = Date.now();
        timerRef.current = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000;
          recordingDurationRef.current = elapsed;
          setRecordingDuration(elapsed);
          if (elapsed >= MAX_RECORD_SECONDS) {
            stopRecordingRef.current();
          }
        }, 100);
      } catch (err) {
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          onError?.('permission');
        } else {
          onError?.('unknown');
        }
        onCancel();
      }
    }, [disabled, state, onCancel, onError, resetToIdle]);

    const stopRecordingRef = useRef<() => void>(() => {});

    const stopRecording = useCallback(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, []);

    stopRecordingRef.current = stopRecording;

    const cancelRecording = useCallback(() => {
      discardRecordingRef.current = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== 'inactive') {
        mr.stop();
        return;
      }
      discardRecordingRef.current = false;
      resetToIdle();
      onCancel();
    }, [onCancel, resetToIdle]);

    useImperativeHandle(ref, () => ({
      startRecording: () => {
        void startRecording();
      },
      cancel: cancelRecording,
    }));

    const togglePlayback = useCallback(() => {
      const audio = audioRef.current;
      if (!audio) return;

      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        void audio.play();
        setIsPlaying(true);
        timerRef.current = setInterval(() => {
          if (!audio.paused) {
            setPlaybackTime(audio.currentTime);
            const progress = audio.currentTime / (audio.duration || 1);
            const bars: number[] = [];
            for (let i = 0; i < 8; i++) {
              const pos = i / 8;
              const dist = Math.abs(pos - progress);
              bars.push(Math.max(4, 4 + Math.max(0, 1 - dist * 3) * 18));
            }
            setPreviewBars(bars);
          }
        }, 50);
      }
    }, [isPlaying]);

    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio?.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * audio.duration;
      setPlaybackTime(audio.currentTime);
    }, []);

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio || state !== 'preview') return;
      const handleEnded = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
        if (timerRef.current) clearInterval(timerRef.current);
        setPreviewBars([4, 4, 4, 4, 4, 4, 4, 4]);
      };
      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }, [state]);

    const handleSend = useCallback(async () => {
      const blob = audioBlobRef.current;
      const duration = Math.max(
        totalDuration,
        recordingDurationRef.current,
        audioRef.current?.duration ?? 0
      );
      if (!blob || blob.size < 200 || duration < MIN_RECORD_SECONDS) {
        onError?.('too_short');
        return;
      }
      audioRef.current?.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      try {
        await Promise.resolve(onSend(blob, duration));
      } catch {
        onError?.('unknown');
        return;
      }
      resetToIdle();
    }, [onSend, totalDuration, resetToIdle, onError]);

    const handleCancelPreview = useCallback(() => {
      resetToIdle();
      onCancel();
    }, [onCancel, resetToIdle]);

    const barShell = cn(
      'flex min-h-[48px] w-full items-center gap-2 rounded-2xl border px-2.5 py-1.5',
      'border-border/80 bg-muted/50 shadow-sm',
      'dark:bg-muted/30'
    );

    return (
      <div className="w-full" dir="rtl">
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {state === 'recording' && `در حال ضبط ${formatTime(recordingDuration)}`}
          {state === 'preview' && 'پیش‌نمایش پیام صوتی'}
        </div>

        <AnimatePresence mode="wait">
          {state === 'recording' && (
            <motion.div
              key="recording"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18 }}
              className={barShell}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 shrink-0 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={cancelRecording}
                aria-label="لغو ضبط"
              >
                <Trash2 className="size-4" />
              </Button>

              <div className="flex shrink-0 items-center gap-2">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500/60 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
                </span>
                <span className="min-w-[3.25rem] text-sm font-medium tabular-nums text-foreground">
                  {formatTime(recordingDuration)}
                </span>
              </div>

              <div className="flex h-9 flex-1 items-center justify-center gap-[3px] px-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full bg-emerald-500/90"
                    animate={{
                      height:
                        waveformHeights[i] ??
                        8 + Math.sin((recordingDuration + i) * 2) * 6,
                    }}
                    transition={{ duration: 0.06 }}
                  />
                ))}
              </div>

              <Button
                type="button"
                size="icon"
                className="size-10 shrink-0 rounded-full bg-red-500 text-white hover:bg-red-600"
                onClick={stopRecording}
                aria-label="پایان ضبط"
              >
                <div className="size-3.5 rounded-sm bg-white" />
              </Button>
            </motion.div>
          )}

          {state === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18 }}
              className={barShell}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 shrink-0 rounded-full text-emerald-600 hover:bg-emerald-500/15"
                onClick={togglePlayback}
                aria-label={isPlaying ? 'توقف' : 'پخش'}
              >
                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ms-0.5" />}
              </Button>

              <div
                dir="ltr"
                className="relative flex h-9 flex-1 cursor-pointer items-center gap-[3px] px-1"
                onClick={handleSeek}
                role="slider"
                aria-label="جابه‌جایی در پیام صوتی"
                aria-valuemin={0}
                aria-valuemax={totalDuration}
                aria-valuenow={playbackTime}
                tabIndex={0}
              >
                <motion.div
                  className="pointer-events-none absolute inset-y-0 left-0 rounded-lg bg-emerald-500/15"
                  animate={{
                    width:
                      totalDuration > 0
                        ? `${(playbackTime / totalDuration) * 100}%`
                        : '0%',
                  }}
                  transition={{ duration: 0.08 }}
                />
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full bg-emerald-600/80 dark:bg-emerald-400/80"
                    animate={{ height: isPlaying ? previewBars[i] : 6 }}
                    transition={{ duration: 0.12 }}
                  />
                ))}
              </div>

              <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                {formatTime(isPlaying ? playbackTime : totalDuration)}
              </span>

              <Button
                type="button"
                size="icon"
                className="size-10 shrink-0 rounded-full bg-emerald-600 text-white hover:bg-emerald-500"
                onClick={() => void handleSend()}
                aria-label="ارسال پیام صوتی"
              >
                <SendHorizontal className="size-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                onClick={handleCancelPreview}
                aria-label="حذف"
              >
                <X className="size-4" />
              </Button>
            </motion.div>
          )}

          {state === 'idle' && !hideIdle && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.12 }}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                className={cn(
                  'size-11 shrink-0 rounded-full',
                  'text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600'
                )}
                onClick={() => void startRecording()}
                aria-label="ضبط پیام صوتی"
              >
                <Mic className="size-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, SendHorizontal, X, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

interface VoiceRecorderProps {
  onSend: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}

type RecorderState = 'idle' | 'recording' | 'preview';

const toPersianDigits = (str: string): string =>
  str.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return toPersianDigits(`${mins}:${secs}`);
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [totalDuration, setTotalDuration] = useState(0);
  const [waveformHeights, setWaveformHeights] = useState<number[]>([]);

  // ─── Refs ─────────────────────────────────────────────────────────────
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const previewBarsRef = useRef<number[]>([4, 4, 4, 4, 4, 4, 4]);

  // ─── Cleanup on Unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioRef.current?.pause();
    };
  }, []);

  // ─── Start Recording ──────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up analyser for waveform
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start waveform animation loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateWaveform = () => {
        analyser.getByteFrequencyData(dataArray);
        // Sample 7 frequency bands
        const bars: number[] = [];
        const bandSize = Math.floor(dataArray.length / 7);
        for (let i = 0; i < 7; i++) {
          let sum = 0;
          for (let j = 0; j < bandSize; j++) {
            sum += dataArray[i * bandSize + j];
          }
          const avg = sum / bandSize;
          // Map 0-255 to 4-28
          bars.push(Math.max(4, 4 + (avg / 255) * 24));
        }
        setWaveformHeights(bars);
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioBlobRef.current = blob;
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;

        // Create audio element for preview playback
        const audio = new Audio(url);
        audioRef.current = audio;
        setTotalDuration(recordingDuration);
        setPlaybackTime(0);
        setIsPlaying(false);

        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setWaveformHeights([]);

        setState('preview');
      };

      mediaRecorder.start(100); // collect data every 100ms
      setState('recording');
      setRecordingDuration(0);

      // Start timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordingDuration(elapsed);
      }, 100);
    } catch {
      onCancel();
    }
  }, [onCancel, recordingDuration]);

  // ─── Stop Recording ───────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ─── Cancel Recording ─────────────────────────────────────────────────
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setWaveformHeights([]);
    onCancel();
  }, [onCancel]);

  // ─── Play / Pause Preview ─────────────────────────────────────────────
  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      audio.play();
      setIsPlaying(true);

      // Update playback time + animate preview bars
      const startTime = Date.now() - playbackTime * 1000;
      timerRef.current = setInterval(() => {
        if (!audio.paused) {
          setPlaybackTime(audio.currentTime);
          // Generate simple preview bars from playback progress
          const progress = audio.currentTime / (audio.duration || 1);
          const bars: number[] = [];
          for (let i = 0; i < 7; i++) {
            const pos = i / 7;
            const dist = Math.abs(pos - progress);
            const height = 4 + Math.max(0, 1 - dist * 3) * 20 + Math.sin(Date.now() / 200 + i) * 4;
            bars.push(Math.max(4, height));
          }
          previewBarsRef.current = bars;
        }
      }, 50);
    }
  }, [isPlaying, playbackTime]);

  // ─── Seek Preview ─────────────────────────────────────────────────────
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // RTL: x position from right
    const x = rect.right - e.clientX;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    audio.currentTime = ratio * audio.duration;
    setPlaybackTime(audio.currentTime);
  }, []);

  // ─── Handle Audio Ended ───────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      setIsPlaying(false);
      setPlaybackTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
      previewBarsRef.current = [4, 4, 4, 4, 4, 4, 4];
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [state]); // re-bind when state changes to 'preview'

  // ─── Send Voice Message ───────────────────────────────────────────────
  const handleSend = useCallback(() => {
    if (!audioBlobRef.current) return;
    audioRef.current?.pause();
    if (timerRef.current) clearInterval(timerRef.current);
    onSend(audioBlobRef.current, totalDuration);
  }, [onSend, totalDuration]);

  // ─── Cancel Preview ───────────────────────────────────────────────────
  const handleCancelPreview = useCallback(() => {
    audioRef.current?.pause();
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    onCancel();
  }, [onCancel]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <AnimatePresence mode="wait">
      {/* ─── RECORDING STATE ─────────────────────────────────────────── */}
      {state === 'recording' && (
        <motion.div
          key="recording"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3 h-12 px-3 rounded-xl bg-zinc-900 dark:bg-zinc-950 border border-zinc-700/50"
        >
          {/* Cancel Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
            onClick={cancelRecording}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Pulsing Red Dot + Timer */}
          <div className="flex items-center gap-2 shrink-0">
            <motion.div
              className="relative flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <div className="absolute h-3 w-3 rounded-full bg-red-500/40" />
            </motion.div>
            <span className="text-sm font-mono text-red-400 tabular-nums min-w-[3.5rem]">
              {formatTime(recordingDuration)}
            </span>
          </div>

          {/* Waveform Bars */}
          <div className="flex items-center gap-[3px] flex-1 justify-center h-full px-2">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <motion.div
                key={i}
                className="w-1 bg-emerald-500 rounded-full"
                animate={{
                  height: waveformHeights.length > 0
                    ? waveformHeights[i]
                    : [4, 12 + Math.random() * 20, 4],
                }}
                transition={
                  waveformHeights.length > 0
                    ? { duration: 0.05 }
                    : {
                        duration: 0.5,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: 'easeInOut',
                      }
                }
              />
            ))}
          </div>

          {/* Stop Recording Button (Square) */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
            onClick={stopRecording}
          >
            <div className="h-3.5 w-3.5 rounded-sm bg-red-500" />
          </Button>
        </motion.div>
      )}

      {/* ─── PREVIEW STATE ──────────────────────────────────────────── */}
      {state === 'preview' && (
        <motion.div
          key="preview"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3 h-12 px-3 rounded-xl bg-zinc-900 dark:bg-zinc-950 border border-zinc-700/50"
        >
          {/* Play / Pause Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
            onClick={togglePlayback}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          {/* Waveform + Seek Bar */}
          <div
            className="flex items-center gap-[3px] flex-1 justify-center h-full px-2 cursor-pointer relative"
            onClick={handleSeek}
            role="slider"
            aria-label="جستجوی صدا"
            aria-valuemin={0}
            aria-valuemax={totalDuration}
            aria-valuenow={playbackTime}
            tabIndex={0}
          >
            {/* Seek progress overlay */}
            <motion.div
              className="absolute inset-y-0 right-0 bg-emerald-500/10 rounded-lg pointer-events-none"
              animate={{
                width: totalDuration > 0
                  ? `${(1 - playbackTime / totalDuration) * 100}%`
                  : '100%',
              }}
              transition={{ duration: 0.1 }}
            />
            {/* Bars */}
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <motion.div
                key={i}
                className="w-1 rounded-full"
                animate={{
                  height: isPlaying
                    ? previewBarsRef.current[i]
                    : 4,
                  backgroundColor: isPlaying
                    ? '#10b981'
                    : '#52525b',
                }}
                transition={
                  isPlaying
                    ? { duration: 0.15 }
                    : { duration: 0.3 }
                }
                style={{
                  backgroundColor: !isPlaying ? undefined : undefined,
                }}
              />
            ))}
          </div>

          {/* Duration */}
          <span className="text-xs font-mono text-zinc-400 tabular-nums shrink-0 min-w-[3rem]">
            {formatTime(isPlaying ? playbackTime : totalDuration)}
          </span>

          {/* Send Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
            onClick={handleSend}
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>

          {/* Cancel Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
            onClick={handleCancelPreview}
          >
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {/* ─── IDLE STATE (Mic Button) ────────────────────────────────── */}
      {state === 'idle' && (
        <motion.div
          key="idle"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-9 w-9 shrink-0 transition-colors',
              'text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10'
            )}
            onClick={startRecording}
            aria-label="ضبط صدا"
          >
            <Mic className="h-5 w-5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

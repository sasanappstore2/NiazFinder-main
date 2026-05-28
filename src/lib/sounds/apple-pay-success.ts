/**
 * Apple Pay–style success chime. Uses `/public/sounds/apple-pay-success.mp3` when present;
 * otherwise synthesizes a short three-note ascending tone (no copyrighted asset bundled).
 */

const SOUND_URL = '/sounds/apple-pay-success.mp3';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioContext();
    }
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }
    return audioContext;
  } catch {
    return null;
  }
}

function playSynthesizedChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const t0 = ctx.currentTime;
  const notes = [
    { freq: 659.25, at: 0, dur: 0.11 },
    { freq: 830.61, at: 0.09, dur: 0.13 },
    { freq: 987.77, at: 0.19, dur: 0.22 },
  ];

  for (const { freq, at, dur } of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = t0 + at;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }
}

export function playApplePaySuccessSound(): void {
  if (typeof window === 'undefined') return;

  const audio = new Audio(SOUND_URL);
  audio.volume = 0.85;
  audio.play().catch(() => playSynthesizedChime());
}

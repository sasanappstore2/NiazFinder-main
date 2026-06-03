'use client';

let audioCtx: AudioContext | null = null;
let ringAbort: AbortController | null = null;
let ringIntervalId: ReturnType<typeof setInterval> | null = null;
const scheduledTimeouts: ReturnType<typeof setTimeout>[] = [];

/** Max output — keeps small laptop speakers from distorting */
const MASTER_GAIN = 0.55;
const SOFT_VOLUME = 0.038;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

function playSoftTone(
  freq: number,
  durationSec: number,
  volume = SOFT_VOLUME,
  type: OscillatorType = 'sine'
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const master = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  const t = ctx.currentTime;
  const attack = Math.min(0.08, durationSec * 0.2);
  const release = Math.min(0.18, durationSec * 0.35);
  const peak = volume * MASTER_GAIN;

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.setValueAtTime(peak, t + Math.max(attack, durationSec - release));
  gain.gain.exponentialRampToValueAtTime(0.0001, t + durationSec);

  master.gain.value = 1;
  osc.connect(gain);
  gain.connect(master);
  master.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + durationSec + 0.02);
}

function scheduleTimeout(fn: () => void, ms: number): void {
  const id = setTimeout(fn, ms);
  scheduledTimeouts.push(id);
}

/** قطع همهٔ صداهای تماس */
export function stopCallTones(): void {
  ringAbort?.abort();
  ringAbort = null;
  if (ringIntervalId) {
    clearInterval(ringIntervalId);
    ringIntervalId = null;
  }
  for (const id of scheduledTimeouts) clearTimeout(id);
  scheduledTimeouts.length = 0;
}

/** صدای انتظار برای تماس‌گیرنده — لحن ملایم، بدون بوق تیز */
export function startOutgoingRingtone(): void {
  stopCallTones();
  ringAbort = new AbortController();
  const signal = ringAbort.signal;

  const cycle = () => {
    if (signal.aborted) return;
    playSoftTone(380, 0.95, 0.034);
    scheduleTimeout(() => {
      if (!signal.aborted) cycle();
    }, 3400);
  };
  cycle();
}

/** زنگ ورودی — دو نت آرام با فاصلهٔ بیشتر */
export function startIncomingRingtone(): void {
  stopCallTones();
  ringAbort = new AbortController();
  const signal = ringAbort.signal;

  const chime = () => {
    if (signal.aborted) return;
    playSoftTone(392, 0.42, 0.032, 'triangle');
    scheduleTimeout(() => {
      if (!signal.aborted) playSoftTone(494, 0.52, 0.03, 'triangle');
    }, 520);
  };

  chime();
  ringIntervalId = setInterval(chime, 2800);
}

/** بوق مشغول (رد تماس / خط مشغول) — کوتاه و ملایم */
export function playBusyTone(): Promise<void> {
  stopCallTones();
  return new Promise((resolve) => {
    let count = 0;
    const beep = () => {
      if (count >= 5) {
        resolve();
        return;
      }
      playSoftTone(420, 0.28, 0.028);
      count += 1;
      scheduleTimeout(beep, 620);
    };
    beep();
  });
}

/** کاربر آفلاین یا در دسترس نیست */
export function playUnavailableTone(): Promise<void> {
  stopCallTones();
  return new Promise((resolve) => {
    playSoftTone(310, 0.5, 0.026);
    scheduleTimeout(() => {
      playSoftTone(280, 0.55, 0.024);
      scheduleTimeout(() => {
        playSoftTone(250, 0.65, 0.022);
        scheduleTimeout(resolve, 900);
      }, 680);
    }, 520);
  });
}

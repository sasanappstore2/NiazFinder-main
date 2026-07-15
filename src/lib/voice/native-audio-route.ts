'use client';

/**
 * Bridge to the native AudioSession Capacitor plugin (mobile/ wrapper app).
 *
 * On the plain web this is a no-op (plugin absent). Inside the NiazFinder
 * native app it switches call audio to the phone-call channel so the earpiece
 * works and the UI can toggle earpiece ↔ speaker like a real dialer.
 */

export type NativeAudioRoute = 'earpiece' | 'speaker';

type AudioSessionPlugin = {
  configureForCall: () => Promise<void>;
  setRoute: (opts: { route: NativeAudioRoute }) => Promise<{ route: NativeAudioRoute }>;
  endCall: () => Promise<void>;
};

function getPlugin(): AudioSessionPlugin | null {
  if (typeof window === 'undefined') return null;
  const cap = (window as unknown as {
    Capacitor?: { Plugins?: { AudioSession?: AudioSessionPlugin } };
  }).Capacitor;
  return cap?.Plugins?.AudioSession ?? null;
}

/** True only inside the native wrapper app. */
export function isNativeAudioAvailable(): boolean {
  return getPlugin() !== null;
}

/** Put the OS audio session in phone-call mode (earpiece by default). */
export async function configureNativeCallAudio(): Promise<void> {
  try {
    await getPlugin()?.configureForCall();
  } catch (e) {
    console.warn('[voice] native audio configure failed', e);
  }
}

export async function setNativeAudioRoute(route: NativeAudioRoute): Promise<void> {
  try {
    await getPlugin()?.setRoute({ route });
  } catch (e) {
    console.warn('[voice] native audio route failed', e);
  }
}

/** Release the call audio session (after hangup). */
export async function endNativeCallAudio(): Promise<void> {
  try {
    await getPlugin()?.endCall();
  } catch (e) {
    console.warn('[voice] native audio end failed', e);
  }
}

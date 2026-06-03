/** Chromium `SpeechRecognition` (Google STT in-browser). Safari only has webkit prefix — excluded. */

export function isChromiumSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.isSecureContext) return false;
  return typeof window.SpeechRecognition === 'function';
}

export function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (!isChromiumSpeechRecognitionSupported()) return null;
  return window.SpeechRecognition;
}

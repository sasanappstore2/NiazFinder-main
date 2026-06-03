'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSpeechRecognitionCtor,
  isChromiumSpeechRecognitionSupported,
} from '@/lib/voice/browser-speech';

export interface UseSpeechToTextOptions {
  lang?: string;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
}

export interface UseSpeechToTextReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

function mapSpeechError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'اجازه میکروفون داده نشد. روی آیکن قفل کنار آدرس کلیک کنید و میکروفون را اجازه دهید.';
    case 'network':
      return 'خطای شبکه در تشخیص گفتار. اتصال اینترنت را بررسی کنید.';
    case 'audio-capture':
      return 'میکروفون در دسترس نیست یا توسط برنامه دیگری استفاده می‌شود.';
    case 'language-not-supported':
      return 'زبان فارسی در این مرورگر پشتیبانی نمی‌شود.';
    default:
      return code ? `تشخیص گفتار: ${code}` : 'تشخیص گفتار ناموفق بود.';
  }
}

export function useSpeechToText({
  lang = 'fa-IR',
  onTranscript,
  onError,
}: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');

  const recRef = useRef<SpeechRecognition | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    setIsSupported(isChromiumSpeechRecognitionSupported());
  }, []);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    recRef.current?.stop();
    recRef.current = null;
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(() => {
    if (activeRef.current) return;

    const API = getSpeechRecognitionCtor();
    if (!API) return;

    const rec = new API();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      let finalPart = '';
      let interimPart = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const text = r[0]?.transcript?.trim() ?? '';
        if (!text) continue;
        if (r.isFinal) {
          finalPart += text;
          onTranscript?.(text, true);
        } else {
          interimPart += text;
          onTranscript?.(text, false);
        }
      }

      if (finalPart) {
        setTranscript((prev) => (prev ? `${prev} ${finalPart}`.trim() : finalPart));
      }
      setInterimTranscript(interimPart);
    };

    rec.onerror = (event) => {
      if (event.error === 'no-speech') return;
      onError?.(mapSpeechError(event.error));
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        stopListening();
      }
    };

    rec.onend = () => {
      if (!activeRef.current) {
        setIsListening(false);
        setInterimTranscript('');
      }
    };

    recRef.current = rec;
    activeRef.current = true;

    try {
      rec.start();
      setIsListening(true);
    } catch {
      activeRef.current = false;
      onError?.(mapSpeechError('start-failed'));
    }
  }, [lang, onTranscript, onError, stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  useEffect(() => () => stopListening(), [stopListening]);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  };
}

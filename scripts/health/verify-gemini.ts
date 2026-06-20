/**
 * Smoke test — Google Gemini API key + model from env.
 * Usage: npm run verify:gemini
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const API_KEY = process.env.GEMINI_API_KEY?.trim();
const MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-flash-latest';
const BASE_URL =
  (process.env.GEMINI_BASE_URL?.trim() || 'https://generativelanguage.googleapis.com/v1beta').replace(
    /\/$/,
    ''
  );

async function main() {
  if (!API_KEY) {
    console.error('GEMINI_API_KEY not set in .env.local');
    process.exit(1);
  }

  console.log(`Testing Gemini model: ${MODEL}`);

  const url = `${BASE_URL}/models/${encodeURIComponent(MODEL)}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Say hello in Persian in 5 words or less.' }] }],
    }),
  });

  const raw = await res.json().catch(() => null);
  if (!res.ok) {
    console.error('Gemini error:', JSON.stringify(raw, null, 2));
    process.exit(1);
  }

  const text =
    raw?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? '')
      .join('')
      .trim() ?? '';

  if (!text) {
    console.error('Gemini returned no text:', JSON.stringify(raw, null, 2));
    process.exit(1);
  }

  console.log('OK:', text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

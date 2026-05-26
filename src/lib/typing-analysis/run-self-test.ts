/**
 * Self-test for rules-only typing analysis pipeline.
 * Run: npm run test:typing-analysis
 */
import { runTypingAnalysis } from './analyze';

async function main() {
  const sessionId = 'self-test';
  const cases = [
    'تعمیرکار کولر فوری غرب تهران',
    'دنبال برنامه‌نویس react هستم',
    'خرید آپارتمان دو خوابه تهران',
    'aaaaaaaaaaaaaaaa',
  ];

  let passed = 0;
  for (const text of cases) {
    const result = await runTypingAnalysis({ sessionId, text, seq: 1 });
    const ok =
      result.sessionId === sessionId &&
      result.textHash.length > 0 &&
      typeof result.confidence === 'number';
    if (ok) passed++;
    console.log(
      ok ? '✓' : '✗',
      text.slice(0, 40),
      '→',
      result.categorySlug,
      result.intent,
      `conf=${result.confidence.toFixed(2)}`,
      result.spam.isSpam ? '[spam]' : ''
    );
  }

  console.log(`\n${passed}/${cases.length} passed`);
  process.exit(passed === cases.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

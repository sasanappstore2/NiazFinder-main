/** Short greetings / small talk — skip tool rounds and answer directly. */

const CASUAL_GREETING_RE =
  /^(?:سلام(?:\s*،?\s*(?:خوبی|خوبید|چطوری|چطورید))?(?:\s*دوباره)?|سلام\s+علیکم|درود(?:\s+بر\s+شما)?|صبح\s+بخیر|عصر\s+بخیر|شب\s+بخیر|چطوری|چطورید|خوبی|خوبید|مرسی|ممنون(?:\s+از\s+راهنمایی)?|متشکرم|تشکر|hi|hello|hey)[\s!.؟?،,]*$/iu;

export function isCasualAgentMessage(text: string): boolean {
  const t = text.trim().replace(/\s+/g, ' ');
  if (!t || t.length > 64) return false;
  return CASUAL_GREETING_RE.test(t);
}

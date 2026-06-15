import { isTestOtpMode } from '@/lib/auth/test-otp';
import { checkRateLimit } from '@/lib/security/rate-limit';

/** Relaxed limits in local test OTP mode to avoid blocking dev workflows. */
export function checkAuthRateLimit(
  key: string,
  productionMax: number,
  windowMs: number
): ReturnType<typeof checkRateLimit> {
  const max = isTestOtpMode() ? Math.max(productionMax * 10, 200) : productionMax;
  return checkRateLimit(key, max, windowMs);
}

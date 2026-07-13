/** Fixed OTP for local/staging — never enabled in production unless explicitly allowed. */
export const TEST_OTP_CODE = '1234';

export function isTestOtpMode(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.ALLOW_TEST_OTP === 'true';
}

export function isTestOtpCode(code: string): boolean {
  return isTestOtpMode() && code.trim() === TEST_OTP_CODE;
}

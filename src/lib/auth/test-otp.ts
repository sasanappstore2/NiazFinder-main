/** Fixed OTP for local/staging — never enabled in production. */
export const TEST_OTP_CODE = '1234';

export function isTestOtpMode(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export function isTestOtpCode(code: string): boolean {
  return isTestOtpMode() && code.trim() === TEST_OTP_CODE;
}

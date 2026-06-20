/** Client-safe OTP settings — mirrors server `otp-config` / `test-otp` without server-only imports. */

export const AUTH_TEST_OTP_CODE = '1234';

export function isAuthTestOtpModeClient(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_ALLOW_TEST_OTP === 'true';
  }
  return process.env.NEXT_PUBLIC_ALLOW_TEST_OTP !== 'false';
}

export const AUTH_OTP_LENGTH = isAuthTestOtpModeClient()
  ? AUTH_TEST_OTP_CODE.length
  : 6;

export const AUTH_OTP_DEMO_CODE = isAuthTestOtpModeClient() ? AUTH_TEST_OTP_CODE : null;

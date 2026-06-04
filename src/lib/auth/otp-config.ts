import { isTestOtpMode, TEST_OTP_CODE } from '@/lib/auth/test-otp';

/** OTP digit count — matches test code length in test mode, 6 in production. */
export const AUTH_OTP_LENGTH = isTestOtpMode() ? TEST_OTP_CODE.length : 6;

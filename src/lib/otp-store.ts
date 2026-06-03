// In-memory OTP storage (shared between otp and verify routes)
// In production, this should be replaced with Redis or a database table

interface OtpRecord {
  phone: string;
  code: string;
  type: string;
  verified: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const otpStore: OtpRecord[] = [];

export function findValidOtp(phone: string, code: string): OtpRecord | null {
  return otpStore
    .filter((r) => r.phone === phone && r.code === code && !r.verified && r.expiresAt > new Date())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] || null;
}

export function findExistingOtp(phone: string): OtpRecord | null {
  return otpStore
    .filter((r) => r.phone === phone && !r.verified && r.expiresAt > new Date())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] || null;
}

export function createOtp(phone: string, code: string, type: string = 'auth', expiresMs: number = 2 * 60 * 1000): OtpRecord {
  const record: OtpRecord = {
    phone,
    code,
    type,
    verified: false,
    expiresAt: new Date(Date.now() + expiresMs),
    createdAt: new Date(),
  };
  otpStore.push(record);
  return record;
}

export function markOtpVerified(phone: string, code: string): OtpRecord | null {
  const record = findValidOtp(phone, code);
  if (record) {
    record.verified = true;
  }
  return record;
}

/** OTP verified within the last `withinMs` (default 10 min) — used for register-phone after verify step. */
export function findRecentlyVerifiedOtp(
  phone: string,
  code?: string,
  withinMs: number = 10 * 60 * 1000
): OtpRecord | null {
  const cutoff = Date.now() - withinMs;
  return (
    otpStore
      .filter(
        (r) =>
          r.phone === phone &&
          r.verified &&
          r.createdAt.getTime() > cutoff &&
          (code == null || r.code === code)
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] || null
  );
}

export function getZarinpalMerchantId(): string {
  return process.env.ZARINPAL_MERCHANT_ID ?? '';
}

export function isZarinpalSandbox(): boolean {
  const v = process.env.ZARINPAL_SANDBOX;
  if (v === 'false' || v === '0') return false;
  if (v === 'true' || v === '1') return true;
  return process.env.NODE_ENV !== 'production';
}

export function getWalletMinDepositToman(): number {
  const n = parseInt(process.env.WALLET_MIN_DEPOSIT_TOMAN ?? '10000', 10);
  return Number.isFinite(n) && n > 0 ? n : 10000;
}

export function getWalletMaxDepositToman(): number {
  const n = parseInt(process.env.WALLET_MAX_DEPOSIT_TOMAN ?? '50000000', 10);
  return Number.isFinite(n) && n > 0 ? n : 50000000;
}

export function getSignupBonusToman(): number {
  const n = parseInt(process.env.SIGNUP_BONUS_TOMAN ?? '100000', 10);
  return Number.isFinite(n) && n > 0 ? n : 100000;
}

export function getReferralRewardToman(): number {
  const n = parseInt(process.env.REFERRAL_REWARD_TOMAN ?? '50000', 10);
  return Number.isFinite(n) && n > 0 ? n : 50000;
}

export function getProLeadDiscountPercent(): number {
  const n = parseInt(process.env.PRO_LEAD_DISCOUNT_PERCENT ?? '20', 10);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 20;
}

export function getBusinessLeadDiscountPercent(): number {
  const n = parseInt(process.env.BUSINESS_LEAD_DISCOUNT_PERCENT ?? '30', 10);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 30;
}

export function getProPlanPriceToman(): number {
  const n = parseInt(process.env.PRO_PLAN_PRICE_TOMAN ?? '200000', 10);
  return Number.isFinite(n) && n > 0 ? n : 200000;
}

export function getBusinessPlanPriceToman(): number {
  const n = parseInt(process.env.BUSINESS_PLAN_PRICE_TOMAN ?? '500000', 10);
  return Number.isFinite(n) && n > 0 ? n : 500000;
}

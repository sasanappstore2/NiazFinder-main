import { getZarinpalMerchantId, isZarinpalSandbox } from '@/lib/payment/env';

/** Zarinpal REST v4 — amounts are Toman throughout this app, matched 1:1 to the API's `amount` field. */
const API_BASE = 'https://api.zarinpal.com/pg/v4/payment';
const SANDBOX_API_BASE = 'https://sandbox.zarinpal.com/pg/v4/payment';

function apiBase(): string {
  return isZarinpalSandbox() ? SANDBOX_API_BASE : API_BASE;
}

function startPayBase(): string {
  return isZarinpalSandbox() ? 'https://sandbox.zarinpal.com/pg/StartPay' : 'https://www.zarinpal.com/pg/StartPay';
}

export class ZarinpalError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = 'ZarinpalError';
    this.code = code;
  }
}

export async function zarinpalRequestPayment(params: {
  amountToman: number;
  callbackUrl: string;
  description: string;
  mobile?: string;
}): Promise<{ authority: string; paymentUrl: string }> {
  const res = await fetch(`${apiBase()}/request.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchant_id: getZarinpalMerchantId(),
      amount: params.amountToman,
      callback_url: params.callbackUrl,
      description: params.description,
      metadata: params.mobile ? { mobile: params.mobile } : undefined,
    }),
  });

  const json = (await res.json()) as {
    data?: { code: number; authority: string };
    errors?: { code: number; message: string } | [];
  };

  if (!json.data?.authority || json.data.code !== 100) {
    const err = Array.isArray(json.errors) ? undefined : json.errors;
    throw new ZarinpalError(err?.message ?? 'خطا در اتصال به درگاه پرداخت', err?.code ?? -1);
  }

  return {
    authority: json.data.authority,
    paymentUrl: `${startPayBase()}/${json.data.authority}`,
  };
}

export async function zarinpalVerifyPayment(params: {
  amountToman: number;
  authority: string;
}): Promise<{ refId: string }> {
  const res = await fetch(`${apiBase()}/verify.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchant_id: getZarinpalMerchantId(),
      amount: params.amountToman,
      authority: params.authority,
    }),
  });

  const json = (await res.json()) as {
    data?: { code: number; ref_id?: number };
    errors?: { code: number; message: string } | [];
  };

  // code 100 = fresh verify, 101 = already verified (still a success — treat idempotently)
  if (!json.data || (json.data.code !== 100 && json.data.code !== 101) || !json.data.ref_id) {
    const err = Array.isArray(json.errors) ? undefined : json.errors;
    throw new ZarinpalError(err?.message ?? 'تایید پرداخت ناموفق بود', err?.code ?? json.data?.code ?? -1);
  }

  return { refId: String(json.data.ref_id) };
}

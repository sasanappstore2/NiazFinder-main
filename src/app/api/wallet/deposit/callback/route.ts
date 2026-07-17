import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { zarinpalVerifyPayment, ZarinpalError } from '@/lib/payment/zarinpal-client';

function redirectToWallet(request: NextRequest, status: 'success' | 'failed'): NextResponse {
  const url = new URL('/dashboard', request.url);
  url.searchParams.set('tab', 'wallet');
  url.searchParams.set('deposit', status);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const authority = searchParams.get('Authority');
  const gatewayStatus = searchParams.get('Status');

  if (!authority) {
    return redirectToWallet(request, 'failed');
  }

  const pending = await db.transaction.findFirst({
    where: { referenceId: authority, type: 'DEPOSIT' },
  });

  if (!pending) {
    return redirectToWallet(request, 'failed');
  }

  // Already settled (retry/duplicate callback hit) — idempotent no-op.
  if (pending.status === 'COMPLETED') {
    return redirectToWallet(request, 'success');
  }
  if (pending.status !== 'PENDING') {
    return redirectToWallet(request, 'failed');
  }

  if (gatewayStatus !== 'OK') {
    await db.transaction.update({
      where: { id: pending.id },
      data: { status: 'FAILED' },
    });
    return redirectToWallet(request, 'failed');
  }

  try {
    await zarinpalVerifyPayment({ amountToman: pending.amount, authority });
  } catch (error) {
    await db.transaction.update({
      where: { id: pending.id },
      data: { status: 'FAILED' },
    });
    if (error instanceof ZarinpalError) {
      return redirectToWallet(request, 'failed');
    }
    console.error('Wallet deposit verify error:', error);
    return redirectToWallet(request, 'failed');
  }

  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${pending.userId} FOR UPDATE`;

    // Re-check under the lock — a concurrent callback retry may have already settled this.
    const locked = await tx.transaction.findUnique({ where: { id: pending.id } });
    if (!locked || locked.status !== 'PENDING') return;

    await tx.transaction.update({
      where: { id: pending.id },
      data: { status: 'COMPLETED', description: 'شارژ کیف پول از طریق درگاه پرداخت' },
    });

    await tx.wallet.update({
      where: { id: pending.walletId },
      data: { balance: { increment: pending.amount } },
    });
  });

  return redirectToWallet(request, 'success');
}

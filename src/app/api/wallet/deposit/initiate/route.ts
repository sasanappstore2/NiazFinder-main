import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getWalletMinDepositToman, getWalletMaxDepositToman } from '@/lib/payment/env';
import { zarinpalRequestPayment, ZarinpalError } from '@/lib/payment/zarinpal-client';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' }, { status: 401 });
    }

    const body = await request.json();
    const amount = body?.amount;

    if (
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return NextResponse.json({ error: 'مبلغ باید یک عدد صحیح مثبت باشد' }, { status: 400 });
    }

    const min = getWalletMinDepositToman();
    const max = getWalletMaxDepositToman();
    if (amount < min || amount > max) {
      return NextResponse.json(
        { error: `مبلغ باید بین ${min.toLocaleString('fa-IR')} تا ${max.toLocaleString('fa-IR')} تومان باشد` },
        { status: 400 }
      );
    }

    let wallet = await db.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      wallet = await db.wallet.create({ data: { userId: user.id } });
    }

    const callbackUrl = new URL('/api/wallet/deposit/callback', request.url).toString();

    const { authority, paymentUrl } = await zarinpalRequestPayment({
      amountToman: amount,
      callbackUrl,
      description: 'شارژ کیف پول نیاز فایندر',
    });

    await db.transaction.create({
      data: {
        walletId: wallet.id,
        userId: user.id,
        type: 'DEPOSIT',
        amount,
        status: 'PENDING',
        referenceId: authority,
        description: 'شارژ کیف پول (در انتظار تایید درگاه)',
      },
    });

    return NextResponse.json({ paymentUrl });
  } catch (error) {
    if (error instanceof ZarinpalError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error('Wallet deposit initiate error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

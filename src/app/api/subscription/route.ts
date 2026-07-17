import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getProPlanPriceToman, getBusinessPlanPriceToman } from '@/lib/payment/env';

const PLAN_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

class InsufficientBalanceError extends Error {
  constructor() {
    super('INSUFFICIENT_BALANCE');
    this.name = 'InsufficientBalanceError';
  }
}

function planPrice(plan: 'PRO' | 'BUSINESS'): number {
  return plan === 'BUSINESS' ? getBusinessPlanPriceToman() : getProPlanPriceToman();
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' }, { status: 401 });
  }

  const subscription = await db.subscription.findUnique({ where: { userId: user.id } });

  return NextResponse.json({
    plan: subscription?.plan ?? 'FREE',
    startedAt: subscription?.startedAt ?? null,
    expiresAt: subscription?.expiresAt ?? null,
    pricing: {
      PRO: getProPlanPriceToman(),
      BUSINESS: getBusinessPlanPriceToman(),
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' }, { status: 401 });
    }

    const body = await request.json();
    const plan = body?.plan;
    if (!plan || !['FREE', 'PRO', 'BUSINESS'].includes(plan)) {
      return NextResponse.json(
        { error: 'پلن نامعتبر است (مقادیر مجاز: FREE, PRO, BUSINESS)' },
        { status: 400 }
      );
    }

    if (plan === 'FREE') {
      const subscription = await db.subscription.upsert({
        where: { userId: user.id },
        create: { userId: user.id, plan: 'FREE' },
        update: { plan: 'FREE', expiresAt: null, autoRenew: false },
      });
      return NextResponse.json({ subscription });
    }

    const price = planPrice(plan);

    const subscription = await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${user.id} FOR UPDATE`;

        let wallet = await tx.wallet.findUnique({ where: { userId: user.id } });
        if (!wallet) {
          wallet = await tx.wallet.create({ data: { userId: user.id } });
        }

        const available = wallet.balance - wallet.frozen;
        if (available < price) {
          throw new InsufficientBalanceError();
        }

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: price } },
        });

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            userId: user.id,
            type: 'PAYMENT',
            amount: price,
            status: 'COMPLETED',
            description: `subscription:${plan}`,
          },
        });

        return tx.subscription.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            plan,
            expiresAt: new Date(Date.now() + PLAN_DURATION_MS),
          },
          update: {
            plan,
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + PLAN_DURATION_MS),
          },
        });
      },
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 }
    );

    return NextResponse.json({ subscription });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: 'موجودی کیف پول کافی نیست' }, { status: 409 });
    }
    console.error('Subscription POST error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

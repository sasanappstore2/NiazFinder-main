import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, type PaginatedResponse } from '@/lib/auth';

/**
 * Upper bound for a single deposit/withdraw (Toman). Rejects absurd/overflow
 * values before we ever open a transaction.
 */
const MAX_WALLET_TX_AMOUNT = 100_000_000_000;

/** Thrown inside the withdraw transaction when the locked balance is insufficient. */
class InsufficientBalanceError extends Error {
  constructor() {
    super('INSUFFICIENT_BALANCE');
    this.name = 'InsufficientBalanceError';
  }
}

// ============ GET handler ============

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;

    // Get or create wallet
    let wallet = await db.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet) {
      wallet = await db.wallet.create({
        data: { userId: user.id },
      });
    }

    // Build transaction where clause
    const where: Record<string, unknown> = { walletId: wallet.id };
    if (type) {
      where.type = type;
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.transaction.count({ where }),
    ]);

    const mappedTransactions = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      referenceId: t.referenceId,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    const response: PaginatedResponse<typeof mappedTransactions[0]> = {
      data: mappedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // If no type filter or type=balance, return wallet balance
    if (!type || type === 'balance') {
      return NextResponse.json({
        wallet: {
          balance: wallet.balance,
          frozen: wallet.frozen,
        },
        transactions: response,
      });
    }

    return NextResponse.json({ transactions: response });
  } catch (error) {
    console.error('Wallet GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}

// ============ POST handler — deposit / withdraw ============

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, amount, description } = body;

    if (!action || !['deposit', 'withdraw'].includes(action)) {
      return NextResponse.json(
        { error: 'عملیات نامعتبر است (مقادیر مجاز: deposit, withdraw)' },
        { status: 400 }
      );
    }

    if (
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        { error: 'مبلغ باید یک عدد صحیح مثبت باشد' },
        { status: 400 }
      );
    }

    if (amount > MAX_WALLET_TX_AMOUNT) {
      return NextResponse.json(
        { error: 'مبلغ وارد شده بیش از حد مجاز است' },
        { status: 400 }
      );
    }

    // Get or create wallet
    let wallet = await db.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet) {
      wallet = await db.wallet.create({
        data: { userId: user.id },
      });
    }

    if (action === 'deposit') {
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'واریز مستقیم به کیف پول از طریق درگاه پرداخت انجام می‌شود' },
          { status: 403 }
        );
      }

      const transaction = await db.$transaction(async (tx) => {
        // Create transaction
        const txRecord = await tx.transaction.create({
          data: {
            walletId: wallet!.id,
            userId: user.id,
            type: 'DEPOSIT',
            amount,
            description: description || 'واریز به کیف پول',
            status: 'COMPLETED',
          },
        });

        // Update wallet balance
        await tx.wallet.update({
          where: { id: wallet!.id },
          data: { balance: { increment: amount } },
        });

        return txRecord;
      });

      return NextResponse.json(
        {
          message: 'واریز با موفقیت انجام شد',
          transaction: {
            id: transaction.id,
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            status: transaction.status,
            createdAt: transaction.createdAt.toISOString(),
          },
        },
        { status: 201 }
      );
    }

    // WITHDRAW — only available (non-frozen) balance may be withdrawn.
    // The balance read + assertion MUST run inside the transaction under a row
    // lock; otherwise two concurrent withdrawals can both pass the check and
    // drive the balance negative.
    const transaction = await db.$transaction(
      async (tx) => {
        // Serialize concurrent withdrawals for this wallet.
        await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${user.id} FOR UPDATE`;

        const locked = await tx.wallet.findUnique({ where: { userId: user.id } });
        if (!locked) {
          throw new InsufficientBalanceError();
        }

        // Re-assert available balance under the lock.
        const available = locked.balance - locked.frozen;
        if (available < amount) {
          throw new InsufficientBalanceError();
        }

        // Create pending transaction
        const txRecord = await tx.transaction.create({
          data: {
            walletId: locked.id,
            userId: user.id,
            type: 'WITHDRAW',
            amount,
            description: description || 'برداشت از کیف پول',
            status: 'PENDING',
          },
        });

        // Deduct from balance, add to frozen
        await tx.wallet.update({
          where: { id: locked.id },
          data: {
            balance: { decrement: amount },
            frozen: { increment: amount },
          },
        });

        return txRecord;
      },
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 }
    );

    return NextResponse.json(
      {
        message: 'درخواست برداشت ثبت شد',
        transaction: {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          status: transaction.status,
          createdAt: transaction.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return NextResponse.json(
        { error: 'موجودی قابل برداشت کافی نیست' },
        { status: 409 }
      );
    }
    console.error('Wallet POST error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}

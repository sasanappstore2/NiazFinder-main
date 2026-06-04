import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateToken, daysFromNow } from '@/lib/auth';
import { hashPassword, verifyPassword, passwordNeedsRehash } from '@/lib/auth/password';

// ============ TYPES ============

interface AuthRequestBody {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: 'CLIENT' | 'SPECIALIST';
}

interface AuthResponseBody {
  user: {
    id: string;
    email: string;
    phone: string | null;
    firstName: string;
    lastName: string;
    displayName: string | null;
    avatar: string | null;
    role: string;
    isVerified: boolean;
    createdAt: Date;
  };
  token: string;
}


// ============ POST handler ============

export async function POST(request: NextRequest) {
  try {
    const body: AuthRequestBody = await request.json();
    const { email, password, firstName, lastName, phone, role } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'ایمیل و رمز عبور الزامی است' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // =====================
    // REGISTER (firstName present)
    // =====================
    if (firstName) {
      // Check if user already exists
      const existingUser = await db.user.findFirst({
        where: {
          OR: [
            { email: normalizedEmail },
            ...(phone ? [{ phone }] : []),
          ],
        },
      });

      if (existingUser) {
        const field = existingUser.email === normalizedEmail ? 'ایمیل' : 'شماره تلفن';
        return NextResponse.json(
          { error: `${field} قبلاً ثبت شده است` },
          { status: 409 }
        );
      }

      // Create user + wallet in a transaction
      const user = await db.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            password: hashPassword(password),
            firstName: firstName.trim(),
            lastName: lastName?.trim() || '',
            phone: phone?.trim() || null,
            role: role || 'CLIENT',
          },
        });

        // Create wallet
        await tx.wallet.create({
          data: { userId: newUser.id },
        });

        return newUser;
      });

      // Generate auth token
      const token = generateToken();
      await db.authToken.create({
        data: {
          userId: user.id,
          token,
          type: 'auth',
          expiresAt: daysFromNow(30),
        },
      });

      const responseBody: AuthResponseBody = {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          avatar: user.avatar,
          role: user.role,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        },
        token,
      };

      return NextResponse.json(
        { message: 'ثبت‌نام با موفقیت انجام شد', ...responseBody },
        { status: 201 }
      );
    }

    // =====================
    // LOGIN (no firstName)
    // =====================
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'کاربری با این ایمیل یافت نشد' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'حساب کاربری شما غیرفعال شده است' },
        { status: 403 }
      );
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: `حساب کاربری شما مسدود شده است: ${user.banReason || 'بدون دلیل'}` },
        { status: 403 }
      );
    }

    if (!verifyPassword(password, user.password)) {
      return NextResponse.json(
        { error: 'رمز عبور اشتباه است' },
        { status: 401 }
      );
    }

    if (passwordNeedsRehash(user.password)) {
      await db.user.update({
        where: { id: user.id },
        data: { password: hashPassword(password) },
      });
    }

    // Generate auth token
    const token = generateToken();
    await db.authToken.create({
      data: {
        userId: user.id,
        token,
        type: 'auth',
        expiresAt: daysFromNow(30),
      },
    });

    // Update last seen
    await db.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date(), online: true },
    });

    const responseBody: AuthResponseBody = {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      token,
    };

    return NextResponse.json(
      { message: 'ورود با موفقیت انجام شد', ...responseBody },
      { status: 200 }
    );
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}

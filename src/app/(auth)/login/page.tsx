'use client';

import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="rounded-xl border border-border/50 bg-background/80 p-6 shadow-lg backdrop-blur-md sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">ورود به حساب کاربری</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          برای دسترسی به تمام امکانات وارد شوید
        </p>
      </div>
      <LoginForm />
    </div>
  );
}

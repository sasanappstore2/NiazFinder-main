'use client';

import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="rounded-xl border border-border/50 bg-background/80 p-6 shadow-lg backdrop-blur-md sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">ایجاد حساب کاربری</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          به جمع متخصصان و کارفرمایان نیاز فایندر بپیوندید
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}

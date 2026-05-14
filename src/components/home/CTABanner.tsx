'use client';

import { ArrowLeft, Users, Check, Headphones, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

const trustItems = [
  { icon: <Check className="size-3.5" aria-hidden="true" />, label: 'ثبت‌نام رایگان' },
  { icon: <Headphones className="size-3.5" aria-hidden="true" />, label: 'پشتیبانی ۲۴/۷' },
  { icon: <Shield className="size-3.5" aria-hidden="true" />, label: 'پرداخت امن' },
];

export function CTABanner() {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const setAuthModalTab = useAppStore((s) => s.setAuthModalTab);

  const handleRegister = () => {
    setAuthModalTab('register');
    setAuthModalOpen(true);
  };

  return (
    <section id="cta" className="relative w-full overflow-hidden bg-gradient-to-l from-emerald-600 via-emerald-700 to-teal-800" aria-label="فراخوان به اقدام" itemScope itemType="https://schema.org/WPAdBlock">
      <div className="container-default mx-auto flex max-w-4xl flex-col items-center px-5 md:px-8 py-20 md:py-32 text-center">
        <h2 className="mb-5 max-w-2xl text-2xl md:text-4xl font-extrabold leading-snug tracking-tight text-white" itemProp="headline">
          آماده‌اید بهترین کسب‌وکارها را پیدا کنید؟
        </h2>

        <p className="mb-10 max-w-xl text-base leading-relaxed text-white/75 md:text-lg" itemProp="description">
          ثبت‌نام رایگان است و در کمتر از ۲ دقیقه انجام می‌شود. هزاران کسب‌وکار منتظر شما هستند.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button
            onClick={handleRegister}
            size="lg"
            className="h-12 rounded-xl bg-white px-8 text-base font-bold text-emerald-700 shadow-xl transition-all 150ms ease hover:bg-white/95"
            data-href="/register"
            title="ثبت‌نام رایگان در نیاز فایندر - تنها در ۲ دقیقه"
          >
            ثبت‌نام رایگان
            <ArrowLeft className="mr-2 size-5" aria-hidden="true" />
          </Button>
          <Button
            onClick={() => navigateTo('browse-specialists')}
            size="lg"
            variant="outline"
            className="h-12 rounded-xl border-2 border-white/30 bg-white/5 px-8 text-base font-bold text-white transition-all 150ms ease hover:border-white/60 hover:bg-white/15"
            data-href="/browse-specialists"
            title="مشاهده لیست کسب‌وکارها برتر و تخصص‌های آن‌ها"
          >
            <Users className="ml-2 size-5" aria-hidden="true" />
            مشاهده کسب‌وکارها
          </Button>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:gap-x-8">
          {trustItems.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-sm font-medium text-white/80">
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <noscript>
        <div className="sr-only">
          <h2>آماده‌اید بهترین کسب‌وکارها را پیدا کنید؟</h2>
          <p>ثبت‌نام رایگان است و در کمتر از ۲ دقیقه انجام می‌شود. هزاران کسب‌وکار منتظر شما هستند. با ثبت‌نام رایگان، پشتیبانی ۲۴/۷ و پرداخت امن در نیاز فایندر.</p>
        </div>
      </noscript>
    </section>
  );
}

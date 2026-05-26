'use client';

import { useRef, useEffect, useState } from 'react';
import { TRUST_STATS } from '@/lib/constants';

function useCountUp(target: number, shouldStart: boolean, duration = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shouldStart) return;
    let startTime: number | null = null;
    let rafId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [shouldStart, target, duration]);

  return count;
}

function StatCard({ stat, inView }: { stat: typeof TRUST_STATS[number]; inView: boolean }) {
  const count = useCountUp(stat.value, inView);

  return (
    <div className="glass-card text-center p-5 md:p-8 hover-lift cursor-default" itemScope itemType="https://schema.org/QuantitativeValue">
      <span className="text-4xl mb-4 block" aria-hidden="true">{stat.icon}</span>
      <p className="mb-2 text-3xl md:text-4xl font-extrabold tabular-nums text-gradient" itemProp="value">
        {count.toLocaleString('fa-IR')}
        <span className="text-xl md:text-2xl">{stat.suffix}</span>
      </p>
      <p className="text-sm font-semibold text-muted-foreground" itemProp="name">{stat.label}</p>
    </div>
  );
}

export function StatsCounter() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="stats" ref={sectionRef} className="section-padding bg-background" aria-label="آمار پلتفرم" itemScope itemType="https://schema.org/Organization">
      <div className="container-default mx-auto px-5 md:px-8">
        <div className="mb-12 text-center">
          <h3 className="mb-3 text-2xl md:text-4xl font-extrabold tracking-tight">
            اعداد و آمار <span className="text-gradient">اعتماد</span>
          </h3>
          <p className="mx-auto max-w-xl text-sm md:text-base text-muted-foreground">
            آماری که نشان‌دهنده اعتماد هزاران کاربر به پلتفرم نیاز فایندر است
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5 md:gap-6 lg:grid-cols-4">
          {TRUST_STATS.map((stat, i) => (
            <StatCard key={i} stat={stat} inView={inView} />
          ))}
        </div>
      </div>

      <noscript>
        <div className="sr-only">
          <h3>اعداد و آمار اعتماد</h3>
          <p>آماری که نشان‌دهنده اعتماد هزاران کاربر به پلتفرم نیاز فایندر است. کسب‌وکار فعال، نیاز ثبت شده، پروژه تکمیل شده، و رضایت کاربران.</p>
        </div>
      </noscript>
    </section>
  );
}

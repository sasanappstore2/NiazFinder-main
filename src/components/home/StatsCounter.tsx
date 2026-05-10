'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { TRUST_STATS } from '@/lib/constants';

/* ─── animation variants ─── */
const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4 },
  },
};

/* ─── helper: smooth count-up from 0 → target ─── */
function useCountUp(target: number, shouldStart: boolean, duration = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shouldStart) return;

    let startTime: number | null = null;
    let rafId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [shouldStart, target, duration]);

  return count;
}

/* ─── individual stat card ─── */
function StatCard({
  stat,
  index,
  inView,
}: {
  stat: (typeof TRUST_STATS)[number];
  index: number;
  inView: boolean;
}) {
  const count = useCountUp(stat.value, inView);
  const displayValue = count.toLocaleString('fa-IR');

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      whileHover={{ scale: 1.05, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group relative rounded-2xl glass p-6 sm:p-8 text-center
                 transition-shadow duration-300 cursor-default
                 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]"
    >
      {/* glow ring on hover */}
      <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100
                      bg-gradient-to-br from-emerald-500/20 via-transparent to-amber-500/20 blur-sm" />

      {/* icon */}
      <div className="relative mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl
                      bg-primary/10 text-4xl
                      [animation:float_3s_ease-in-out_infinite]
                      [&:hover]:[animation:pulse_1s_ease-in-out_infinite]">
        {/* pulse ring behind icon */}
        <span className="animate-pulse-ring absolute inset-0 rounded-2xl bg-primary/10" />
        <span className="relative">{stat.icon}</span>
      </div>

      {/* number */}
      <p className="mb-1 text-3xl font-extrabold sm:text-4xl md:text-5xl
                     bg-gradient-to-l from-emerald-600 to-emerald-400 bg-clip-text text-transparent
                     tabular-nums leading-tight">
        {displayValue}
        <span className="text-2xl sm:text-3xl md:text-4xl">{stat.suffix}</span>
      </p>

      {/* label */}
      <p className="text-sm font-medium text-muted-foreground sm:text-base">
        {stat.label}
      </p>
    </motion.div>
  );
}

/* ─── main exported component ─── */
export function StatsCounter() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-80px' });

  return (
    <section ref={sectionRef} className="relative w-full overflow-hidden mesh-gradient-bg">
      {/* gradient-line separator at top */}
      <div className="gradient-line" />

      {/* decorative blurred blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-emerald-400/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-amber-400/8 blur-3xl" />

      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28"
      >
        {/* heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0 }}
          className="mb-12 text-center sm:mb-16"
        >
          <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            اعداد و آمار{' '}
            <span className="bg-gradient-to-l from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
              اعتماد
            </span>
          </h2>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
            آماری که نشان‌دهنده اعتماد هزاران کاربر به پلتفرم نیاز فایندر است
          </p>
        </motion.div>

        {/* stats grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
          {TRUST_STATS.map((stat, i) => (
            <StatCard key={i} stat={stat} index={i} inView={inView} />
          ))}
        </div>
      </motion.div>

      {/* gradient-line separator at bottom */}
      <div className="gradient-line" />
    </section>
  );
}

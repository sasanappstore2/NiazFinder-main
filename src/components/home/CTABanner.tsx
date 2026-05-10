'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Users, Sparkles, Shield, Headphones, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: 'easeOut' as const },
  },
};

const trustItems = [
  { icon: <Check className="size-3.5" />, label: 'ثبت‌نام رایگان' },
  { icon: <Headphones className="size-3.5" />, label: 'پشتیبانی ۲۴/۷' },
  { icon: <Shield className="size-3.5" />, label: 'پرداخت امن' },
];

const decorativeShapes = [
  { size: 'size-72', className: '-top-20 -right-20', delay: 0 },
  { size: 'size-96', className: '-bottom-32 -left-32', delay: 2 },
  { size: 'size-48', className: 'top-1/4 -left-12', delay: 4 },
  { size: 'size-56', className: 'bottom-1/4 -right-16', delay: 1 },
  { size: 'size-40', className: 'top-10 left-1/3', delay: 3 },
];

export function CTABanner() {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const setAuthModalTab = useAppStore((s) => s.setAuthModalTab);

  const handleRegister = () => {
    setAuthModalTab('register');
    setAuthModalOpen(true);
  };

  const handleBrowseSpecialists = () => {
    navigateTo('browse-specialists');
  };

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-l from-emerald-600 via-emerald-700 to-teal-800">
      {/* Noise texture overlay */}
      <div className="noise-overlay absolute inset-0 z-0" />

      {/* Geometric dot pattern */}
      <div
        className="absolute inset-0 z-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Decorative blurred shapes */}
      {decorativeShapes.map((shape, i) => (
        <motion.div
          key={i}
          className={`absolute ${shape.size} ${shape.className} rounded-full bg-white/10 blur-3xl z-0`}
          animate={{
            scale: [1, 1.15, 1],
            rotate: [0, 180, 360],
            opacity: [0.08, 0.14, 0.08],
          }}
          transition={{
            duration: 18,
            delay: shape.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Subtle diagonal lines */}
      <div
        className="absolute inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 40px, white 40px, white 41px)',
        }}
      />

      {/* Main content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8 lg:py-28"
      >
        {/* Badge */}
        <motion.div variants={childVariants}>
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            <Sparkles className="size-4" />
            همین الان شروع کنید
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h2
          variants={childVariants}
          className="mb-5 max-w-2xl text-2xl font-extrabold leading-snug tracking-tight text-white sm:text-3xl md:text-4xl lg:text-[2.5rem]"
        >
          آماده‌اید بهترین متخصص‌ها را پیدا کنید؟
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          variants={childVariants}
          className="mb-10 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg"
        >
          ثبت‌نام رایگان است و در کمتر از ۲ دقیقه انجام می‌شود. هزاران متخصص منتظر شما
          هستند.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={childVariants}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          {/* Primary CTA */}
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={handleRegister}
              size="lg"
              className="group relative h-13 overflow-hidden rounded-xl bg-white px-8 text-base font-bold text-emerald-700 shadow-lg shadow-black/10 transition-colors duration-200 hover:bg-white/90"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald-100 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative z-10">ثبت‌نام رایگان</span>
              <ArrowLeft className="relative z-10 mr-2 size-5 transition-transform duration-300 group-hover:-translate-x-1" />
            </Button>
          </motion.div>

          {/* Secondary CTA */}
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={handleBrowseSpecialists}
              size="lg"
              variant="outline"
              className="group h-13 rounded-xl border-2 border-white/30 bg-transparent px-8 text-base font-bold text-white backdrop-blur-sm transition-all duration-200 hover:border-white/60 hover:bg-white/10"
            >
              <Users className="ml-2 size-5 transition-transform duration-300 group-hover:scale-110" />
              مشاهده متخصص‌ها
            </Button>
          </motion.div>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          variants={childVariants}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:gap-x-8"
        >
          {trustItems.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-sm text-white/80"
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}

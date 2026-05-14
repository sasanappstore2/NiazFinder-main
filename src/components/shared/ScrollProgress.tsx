'use client';

import { useEffect, useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

// ============ Scroll Progress Indicator ============
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 50,
    restDelta: 0.001,
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.div
      className="fixed top-0 inset-x-0 z-[calc(var(--z-header)+1)] h-[3px] origin-right"
      style={{ scaleX }}
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-l from-emerald-400 via-emerald-500 to-teal-500 opacity-90 transition-opacity duration-300"
        style={{ opacity: isVisible ? 1 : 0 }}
      />
    </motion.div>
  );
}

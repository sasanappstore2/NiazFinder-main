'use client';

import { motion } from 'framer-motion';

interface TemplateProps {
  children: React.ReactNode;
}

const variants = {
  hidden: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function Template({ children }: TemplateProps) {
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="enter"
      exit="exit"
      transition={{
        type: 'tween',
        ease: 'easeInOut',
        duration: 0.2,
      }}
      dir="rtl"
    >
      {children}
    </motion.div>
  );
}

"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { AnimatePresence, motion, LayoutGroup } from "framer-motion"

interface AnimatedListItemProps {
  children: ReactNode
  className?: string
}

export function AnimatedListItem({ children, className }: AnimatedListItemProps) {
  return (
    <motion.li
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      layout
      className={className}
    >
      {children}
    </motion.li>
  )
}

interface AnimatedListProps {
  children: ReactNode
  className?: string
}

export function AnimatedList({ children, className }: AnimatedListProps) {
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [children])

  return (
    <ul ref={listRef} className={className}>
      <LayoutGroup>
        <AnimatePresence initial={false}>{children}</AnimatePresence>
      </LayoutGroup>
    </ul>
  )
}

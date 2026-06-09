import type { Variants, Transition, TargetAndTransition } from 'framer-motion'

export const fadeSlideUp: {
  initial: TargetAndTransition
  animate: TargetAndTransition
  exit: TargetAndTransition
} = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
}

export const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.08 } },
}

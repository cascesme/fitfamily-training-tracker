export const fadeSlideUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export const springTransition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
}

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
}

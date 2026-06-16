import type { Transition, Variants } from 'framer-motion';

export const DURATION = {
  fast: 0.18,
  normal: 0.24,
  slow: 0.32,
} as const;

export const EASE = [0.4, 0, 0.2, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASE },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.normal, ease: EASE } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

export const softPageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: EASE },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.18, ease: EASE },
  },
};

export const sheetSlide: Transition = {
  type: 'spring',
  damping: 32,
  stiffness: 340,
  mass: 0.85,
};

export const tapScale = {
  whileTap: { scale: 0.97 },
  transition: { duration: 0.12, ease: EASE },
};

export const cardEntrance: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATION.slow, ease: EASE },
  },
};

export const bubbleIn: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATION.normal, ease: EASE },
  },
};

export const chipStagger: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: DURATION.normal, ease: EASE },
  }),
};

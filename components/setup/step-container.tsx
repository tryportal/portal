"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface StepContainerProps {
  children: ReactNode;
  step: number;
  direction: number;
}

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 20 : -20,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -20 : 20,
    opacity: 0,
  }),
};

const transition = {
  duration: 0.2,
  ease: "easeOut" as const,
};

export function StepContainer({ children, step, direction }: StepContainerProps) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={step}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={transition}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Wrapper for individual step content with staggered children
interface StepContentProps {
  children: ReactNode;
  className?: string;
}

export function StepContent({ children, className = "" }: StepContentProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Animated heading for each step
interface StepHeadingProps {
  title: string;
  description: string;
}

export function StepHeading({ title, description }: StepHeadingProps) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

// Animated form field wrapper with stagger support
interface StepFieldProps {
  children: ReactNode;
  delay?: number;
}

export function StepField({ children, delay = 0 }: StepFieldProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, delay }}
    >
      {children}
    </motion.div>
  );
}

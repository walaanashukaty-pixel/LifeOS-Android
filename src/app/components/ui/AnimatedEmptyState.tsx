import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';

type AnimatedEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function AnimatedEmptyState({ icon: Icon, title, description, action }: AnimatedEmptyStateProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-14 text-center"
    >
      <motion.div
        aria-hidden="true"
        className="absolute -top-20 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        animate={reduceMotion ? undefined : { scale: [0.92, 1.08, 0.92], opacity: [0.4, 0.76, 0.4] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
        animate={reduceMotion ? undefined : { y: [0, -5, 0], rotate: [0, -2, 2, 0] }}
        transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Icon size={28} />
      </motion.div>
      <p className="relative mb-1 text-base font-semibold text-foreground">{title}</p>
      <p className="relative mx-auto mb-5 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      {action && <div className="relative">{action}</div>}
    </motion.div>
  );
}

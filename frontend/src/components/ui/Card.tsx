import type { HTMLAttributes } from 'react'
import clsx from 'clsx'
import { motion } from 'framer-motion'

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={clsx(
        'rounded-2xl bg-surface-card border border-lagoon-100/60 shadow-soft',
        className,
      )}
      {...(props as any)}
    >
      {children}
    </motion.div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('px-5 pt-5 pb-3', className)} {...props}>
      {children}
    </div>
  )
}

export function CardBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('px-5 pb-5', className)} {...props}>
      {children}
    </div>
  )
}

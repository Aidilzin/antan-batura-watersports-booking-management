import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative min-h-svh overflow-hidden bg-gradient-to-br from-lagoon-600 via-lagoon-500 to-aqua-400">
      {/* Ambient ripples — decorative, purely atmospheric */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-aqua-200/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-svh max-w-6xl flex-col items-center justify-center gap-10 px-4 py-10 lg:flex-row lg:justify-between">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-md text-white lg:pr-8"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-aqua-200" />
            Tasik Shah Alam, Selangor
          </div>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Antan Batura Watersports</h1>
          <p className="mt-3 text-white/80">
            Book kayaks, canoes, paddle boats and cruise boats — clear availability, honest pricing, a receipt every time.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel w-full max-w-sm rounded-3xl p-7 sm:p-8"
        >
          <h2 className="text-xl font-semibold text-ink-950">{title}</h2>
          <p className="mt-1 text-sm text-ink-600">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </motion.div>
      </div>
    </div>
  )
}

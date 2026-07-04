import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
}: {
  title: string
  description: string
  actionLabel?: string
  actionTo?: string
  onAction?: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-lagoon-200 bg-lagoon-50/40 px-6 py-16 text-center"
    >
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-lagoon-100 text-lagoon-500">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 15c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v9" opacity={0.4} />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-ink-950">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-500">{description}</p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          onClick={onAction}
          className="focus-ring mt-5 inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-lagoon-500 to-lagoon-600 px-4 py-2.5 text-sm font-medium text-white shadow-soft transition-all hover:from-lagoon-400 hover:to-lagoon-500"
        >
          {actionLabel}
        </Link>
      )}
    </motion.div>
  )
}

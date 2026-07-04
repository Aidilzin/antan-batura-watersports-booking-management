import { AnimatePresence, motion } from 'framer-motion'
import type { BookingStatus, EquipmentStatus, PaymentStatus } from '../../types'

type Status = BookingStatus | EquipmentStatus | PaymentStatus

const CONFIG: Record<Status, { label: string; dot: string; text: string; bg: string }> = {
  // booking lifecycle
  pending: { label: 'Pending', dot: 'bg-status-pending', text: 'text-amber-800', bg: 'bg-amber-50' },
  confirmed: { label: 'Confirmed', dot: 'bg-status-confirmed', text: 'text-green-800', bg: 'bg-green-50' },
  checked_in: { label: 'Checked in', dot: 'bg-lagoon-500', text: 'text-lagoon-800', bg: 'bg-lagoon-50' },
  in_use: { label: 'In use', dot: 'bg-aqua-500', text: 'text-aqua-800', bg: 'bg-aqua-50' },
  completed: { label: 'Completed', dot: 'bg-ink-600', text: 'text-ink-700', bg: 'bg-ink-100/60' },
  cancelled: { label: 'Cancelled', dot: 'bg-status-failed', text: 'text-red-700', bg: 'bg-red-50' },
  // equipment
  available: { label: 'Available', dot: 'bg-status-available', text: 'text-emerald-800', bg: 'bg-emerald-50' },
  booked: { label: 'Booked', dot: 'bg-status-booked', text: 'text-amber-800', bg: 'bg-amber-50' },
  maintenance: { label: 'Maintenance', dot: 'bg-status-maintenance', text: 'text-slate-700', bg: 'bg-slate-100' },
  // payment
  failed: { label: 'Failed', dot: 'bg-status-failed', text: 'text-red-700', bg: 'bg-red-50' },
}

export function StatusPill({ status, className = '' }: { status: Status; className?: string }) {
  const cfg = CONFIG[status]

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={status}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.2 }}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text} ${className}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </motion.span>
    </AnimatePresence>
  )
}

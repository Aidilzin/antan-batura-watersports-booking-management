import { useMemo } from 'react'
import { api } from '../../lib/api'
import type { Booking } from '../../types'
import { CheckInStep } from './CheckInStep'
import { PaymentStep } from './PaymentStep'
import { HandoverStep } from './HandoverStep'
import { UsageTimer } from './UsageTimer'
import { ReturnStep } from './ReturnStep'
import { ReceiptSummary } from './ReceiptSummary'

/**
 * Renders the right step of the business process for the booking's current
 * status: check-in -> payment -> handover -> usage -> return -> receipt.
 */
export function BookingWorkflow({ booking, onUpdate }: { booking: Booking; onUpdate: (b: Booking) => void }) {
  const baseAmount = useMemo(() => {
    if (!booking.equipment) return 0
    const [sh, sm] = booking.start_time.split(':').map(Number)
    const [eh, em] = booking.end_time.split(':').map(Number)
    const hours = (eh * 60 + em - (sh * 60 + sm)) / 60
    const hourlyRate = parseFloat(String(booking.equipment.hourly_rate))
    return isNaN(hourlyRate) ? 0 : hourlyRate * hours
  }, [booking])

  const hasConfirmedBookingPayment = booking.payments?.some((p) => p.status === 'confirmed' && p.purpose === 'booking')

  if (booking.status === 'cancelled') {
    return <ReceiptSummary booking={booking} />
  }

  if (booking.status === 'pending' || booking.status === 'confirmed') {
    return <CheckInStep booking={booking} onUpdate={onUpdate} />
  }

  if (booking.status === 'checked_in' && !hasConfirmedBookingPayment) {
    return (
      <PaymentStep
        booking={booking}
        suggestedAmount={baseAmount}
        purpose="booking"
        onConfirmed={async () => {
          const res = await api.get(`/bookings/${booking.id}`)
          onUpdate(res.data.data)
        }}
      />
    )
  }

  if (booking.status === 'checked_in' && hasConfirmedBookingPayment) {
    return <HandoverStep booking={booking} onUpdate={onUpdate} />
  }

  if (booking.status === 'in_use') {
    return (
      <div className="space-y-4">
        <UsageTimer booking={booking} />
        <ReturnStep booking={booking} onUpdate={onUpdate} />
      </div>
    )
  }

  if (booking.status === 'completed') {
    return <ReceiptSummary booking={booking} />
  }

  return null
}

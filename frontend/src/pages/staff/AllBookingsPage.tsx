import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import type { Booking, BookingStatus } from '../../types'
import { Card, CardBody } from '../../components/ui/Card'
import { StatusPill } from '../../components/ui/StatusPill'
import { EquipmentIcon } from '../../components/EquipmentIcon'
import { EmptyState } from '../../components/ui/EmptyState'
import { Select } from '../../components/ui/Input'

const STATUS_OPTIONS: { value: BookingStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked in' },
  { value: 'in_use', label: 'In use' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function AllBookingsPage() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<BookingStatus | ''>('')

  useEffect(() => {
    setLoading(true)
    api
      .get('/bookings', { params: status ? { status } : {} })
      .then((res) => setBookings(res.data.data))
      .finally(() => setLoading(false))
  }, [status])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-950">All bookings</h1>
          <p className="mt-1 text-ink-600">Every booking across the business, most recent first.</p>
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as BookingStatus | '')} className="w-48">
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-lagoon-50" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No bookings found" description="Try a different status filter, or check back after the next booking comes in." />
        </div>
      ) : (
        <div className="mt-6 space-y-2.5">
          {bookings.map((booking) => (
            <Card key={booking.id} className="cursor-pointer group hover:border-lagoon-250 transition-all shadow-sm hover:shadow-soft" onClick={() => navigate(`/desk?ref=${booking.booking_reference}`)}>
              <CardBody className="flex flex-wrap items-center justify-between gap-3 pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-lagoon-50 text-lagoon-600">
                    {booking.equipment && <EquipmentIcon type={booking.equipment.type} className="h-4.5 w-4.5" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-950">{booking.customer?.name} · {booking.equipment?.name}</p>
                    <p className="text-xs text-ink-500">
                      {booking.booking_date} · {booking.start_time}–{booking.end_time} · <span className="font-mono">{booking.booking_reference}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xxs uppercase tracking-wide text-ink-400">{booking.channel.replace('_', ' ')}</span>
                  <StatusPill status={booking.waitlisted ? 'pending' : booking.status} />
                  <span className="text-xs font-semibold text-lagoon-600 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                    Manage →
                  </span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

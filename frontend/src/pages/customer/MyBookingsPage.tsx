import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, apiErrorMessage } from '../../lib/api'
import type { Booking } from '../../types'
import { useAuth } from '../../lib/auth'

import { StatusPill } from '../../components/ui/StatusPill'
import { EquipmentIcon } from '../../components/EquipmentIcon'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardBody } from '../../components/ui/Card'
import { motion, AnimatePresence } from 'framer-motion'

export function MyBookingsPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Guest lookup state
  const [searchRef, setSearchRef] = useState('')
  const [searchedBooking, setSearchedBooking] = useState<Booking | null>(null)
  const [searching, setSearching] = useState(false)

  function fetchBookings() {
    if (!user) {
      setLoading(false)
      return
    }
    api
      .get('/bookings')
      .then((res) => setBookings(res.data.data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!authLoading) {
      fetchBookings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchRef.trim()) return
    setSearching(true)
    setError(null)
    setSearchedBooking(null)
    try {
      const res = await api.get(`/bookings/reference/${searchRef.trim().toUpperCase()}`)
      setSearchedBooking(res.data.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSearching(false)
    }
  }

  async function handleCancel(bookingId: number, isGuest = false) {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return
    setCancellingId(bookingId)
    setError(null)
    try {
      if (isGuest && searchedBooking) {
        const res = await api.post(`/bookings/reference/${searchedBooking.booking_reference}/cancel`)
        setSearchedBooking(res.data.data)
      } else {
        await api.post(`/bookings/${bookingId}/cancel`)
        fetchBookings()
      }
    } catch (err) {
      setError(apiErrorMessage(err))
      setCancellingId(null)
    } finally {
      setCancellingId(null)
    }
  }

  if (authLoading || (loading && user)) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-lagoon-100" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-lagoon-50" />
        ))}
      </div>
    )
  }

  // Render Guest Lookup Screen if not logged in
  if (!user) {
    return (
      <div className="max-w-md mx-auto py-12 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-ink-950">Manage booking</h1>
          <p className="text-xs text-ink-500">
            Enter your booking reference ID to view receipt, check waitlist, or cancel reservation.
          </p>
        </div>

        <Card>
          <CardBody className="pt-5">
            <form onSubmit={handleSearch} className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  label="Reference ID"
                  required
                  placeholder="e.g. AB-XXXXXX"
                  value={searchRef}
                  onChange={(e) => setSearchRef(e.target.value)}
                />
              </div>
              <Button type="submit" loading={searching}>
                Search
              </Button>
            </form>
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          </CardBody>
        </Card>

        <AnimatePresence mode="wait">
          {searchedBooking && (
            <motion.div
              key={searchedBooking.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <BookingCard
                booking={searchedBooking}
                cancelling={cancellingId === searchedBooking.id}
                onCancel={() => handleCancel(searchedBooking.id, true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-ink-950">My bookings</h1>
        <p className="mt-1 text-ink-600">Track and manage your watersports equipment bookings.</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-3.5 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          description="Ready to hit the water? Book your single kayak, canoe, or paddle boat now."
          actionLabel="Book equipment"
          onAction={() => navigate('/book')}
        />
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {bookings.map((booking) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <BookingCard
                  booking={booking}
                  cancelling={cancellingId === booking.id}
                  onCancel={() => handleCancel(booking.id, false)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function BookingCard({
  booking,
  cancelling,
  onCancel,
}: {
  booking: Booking
  cancelling: boolean
  onCancel: () => void
}) {
  const confirmedPayments = booking.payments?.filter((p) => p.status === 'confirmed') ?? []
  const totalPaid = confirmedPayments.reduce((sum, p) => sum + Number(p.amount), 0)

  // Calculate base cost
  const [sh, sm] = booking.start_time.split(':').map(Number)
  const [eh, em] = booking.end_time.split(':').map(Number)
  const hours = (eh * 60 + em - (sh * 60 + sm)) / 60
  const rate = booking.equipment ? parseFloat(String(booking.equipment.hourly_rate)) : 0
  const baseCost = isNaN(rate) ? 0 : rate * hours

  const overtimeCost = booking.usage_log ? parseFloat(String(booking.usage_log.extra_charge_amount)) : 0
  const damageCost = booking.damage_reports && booking.damage_reports.length > 0
    ? parseFloat(String(booking.damage_reports[0].deposit_charged))
    : 0

  const totalCost = baseCost + overtimeCost + damageCost
  const outstandingBalance = Math.max(0, totalCost - totalPaid)

  const isPendingOrConfirmed = booking.status === 'pending' || booking.status === 'confirmed'
  const isWaitlist = booking.waitlisted

  return (
    <Card className="hover:border-lagoon-200 transition-colors">
      <CardBody className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-lagoon-50 text-lagoon-600">
            <EquipmentIcon type={booking.equipment?.type as any} className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-ink-500 tracking-wider">
                {booking.booking_reference}
              </span>
              <StatusPill status={booking.status} />
              {isWaitlist && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                  Waitlist
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-ink-950 leading-tight">
              {booking.equipment?.name || 'Watercraft'}
            </h3>
            <p className="text-xs text-ink-600 font-medium">
              📅 {booking.booking_date} · ⏰ {booking.start_time}–{booking.end_time} ({hours} {hours === 1 ? 'hour' : 'hours'})
            </p>
            
            {/* Price breakdown inside customer card */}
            <div className="mt-2 text-xxs text-ink-500 bg-surface-sunken/60 border border-ink-100 rounded-lg p-2 max-w-sm space-y-1">
              <div className="flex justify-between">
                <span>Rental fee:</span>
                <span>RM {baseCost.toFixed(2)}</span>
              </div>
              {overtimeCost > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Overtime ({booking.usage_log?.exceeded_minutes} min):</span>
                  <span>RM {overtimeCost.toFixed(2)}</span>
                </div>
              )}
              {damageCost > 0 && (
                <div className="flex justify-between text-red-700">
                  <span>Damage Charge:</span>
                  <span>RM {damageCost.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-ink-200 pt-1 font-bold text-ink-700">
                <span>Paid / Outstanding:</span>
                <span>RM {totalPaid.toFixed(2)} / RM {outstandingBalance.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-2 shrink-0 self-start md:self-center">
          {isPendingOrConfirmed && (
            <Button
              variant="secondary"
              className="text-xs border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600"
              loading={cancelling}
              onClick={onCancel}
            >
              Cancel Booking
            </Button>
          )}
          {booking.status === 'pending' && totalPaid === 0 && (
            <div className="text-[10px] text-amber-700 bg-amber-50 rounded-lg border border-amber-200 px-3 py-2 font-medium max-w-[200px]">
              ⚠️ Please present reference ID at front desk to pay and confirm.
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

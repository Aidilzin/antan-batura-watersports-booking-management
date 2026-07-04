import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, apiErrorMessage } from '../../lib/api'
import type { Booking } from '../../types'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { StatusPill } from '../../components/ui/StatusPill'
import { EquipmentIcon } from '../../components/EquipmentIcon'
import { BookingWorkflow } from '../../components/staff/BookingWorkflow'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function FrontDeskPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [reference, setReference] = useState(searchParams.get('ref') ?? '')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Real-time Today's Operations Dashboard States
  const [todayBookings, setTodayBookings] = useState<Booking[]>([])
  const [loadingToday, setLoadingToday] = useState(false)

  async function lookupReference(ref: string) {
    if (!ref.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/bookings/reference/${ref.trim().toUpperCase()}`)
      setBooking(res.data.data)
      setReference(ref.trim().toUpperCase())
      setSearchParams({ ref: ref.trim().toUpperCase() })
    } catch (err) {
      setError(apiErrorMessage(err))
      setBooking(null)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTodayBookings() {
    setLoadingToday(true)
    try {
      const res = await api.get('/bookings', { params: { date: todayISO() } })
      setTodayBookings(res.data.data || [])
    } catch (err) {
      console.error("Failed to load today's operations", err)
    } finally {
      setLoadingToday(false)
    }
  }

  useEffect(() => {
    fetchTodayBookings()
    const ref = searchParams.get('ref')
    if (ref) lookupReference(ref)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await lookupReference(reference)
  }

  function handleSelectTodayBooking(ref: string) {
    lookupReference(ref)
  }

  async function handleCancelBooking() {
    if (!booking) return
    if (!window.confirm(`Are you sure you want to cancel booking ${booking.booking_reference}?`)) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.post(`/bookings/${booking.id}/cancel`)
      setBooking(res.data.data)
      fetchTodayBookings()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // Filter Today's Bookings into Operational Stages
  const arrivals = todayBookings.filter(b => b.status === 'pending' || b.status === 'confirmed')
  const checkedIn = todayBookings.filter(b => b.status === 'checked_in')
  const inUse = todayBookings.filter(b => b.status === 'in_use')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-950">Front desk</h1>
        <p className="mt-1 text-ink-600">
          Manage real-time customer check-ins, payment verification, handovers, and boat returns for today.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left Column: Active Operational Workflow */}
        <div className="space-y-4">
          <Card>
            <CardBody className="pt-5">
              <h2 className="text-sm font-semibold text-ink-900 mb-3">Load Booking Session</h2>
              <form onSubmit={handleSubmit} className="flex items-end gap-3">
                <div className="flex-1">
                  <Input
                    label="Booking reference"
                    placeholder="e.g. AB-7F3K2Q"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="uppercase"
                  />
                </div>
                <Button type="submit" loading={loading}>Load</Button>
              </form>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            </CardBody>
          </Card>

          {booking ? (
            <div className="space-y-4">
              <Card className="border-lagoon-200 bg-lagoon-50/20">
                <CardBody className="pt-5 pb-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-lagoon-500 text-white">
                        {booking.equipment && <EquipmentIcon type={booking.equipment.type} className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-semibold text-ink-950 text-base">{booking.customer?.name}</p>
                        <p className="text-xs text-ink-600">
                          {booking.equipment?.name} · {booking.booking_date} ·{' '}
                          <span className="font-semibold text-ink-900">{booking.start_time}–{booking.end_time}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-lagoon-600 bg-white border border-lagoon-200 rounded px-2 py-0.5">
                        {booking.booking_reference}
                      </span>
                      <StatusPill status={booking.status} />
                      {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={handleCancelBooking}
                          className="text-[10px] font-bold uppercase tracking-wider text-red-650 hover:text-red-800 hover:bg-red-50 border border-red-200 hover:border-red-300 rounded px-2.5 py-1.5 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>

              <div>
                <BookingWorkflow
                  booking={booking}
                  onUpdate={(updated) => {
                    setBooking(updated)
                    fetchTodayBookings()
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-ink-300 p-12 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-sunken text-ink-400 mb-3">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-ink-900">No Booking Loaded</h3>
              <p className="text-xs text-ink-500 mt-1 max-w-xs mx-auto">
                Search for a customer reference ID or click a guest card from the live dashboard to drive their checkout workflow.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Live Operations Dashboard for Today */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ink-950 text-sm flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ripple" />
              Today's Live Board
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchTodayBookings}
              loading={loadingToday}
            >
              Refresh
            </Button>
          </div>

          <div className="space-y-4">
            {/* Arrivals column */}
            <div className="rounded-2xl border border-ink-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-ink-100 pb-2">
                <h3 className="text-xs font-bold text-ink-800 uppercase tracking-wide">1. Arrivals & Payments</h3>
                <span className="rounded bg-ink-100 px-1.5 py-0.5 text-xxs font-bold text-ink-600">
                  {arrivals.length}
                </span>
              </div>
              {arrivals.length === 0 ? (
                <p className="text-xxs text-ink-400 py-2">No pending arrivals left for today.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {arrivals.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleSelectTodayBooking(b.booking_reference)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                        booking?.id === b.id
                          ? 'border-lagoon-500 bg-lagoon-50/50'
                          : 'border-ink-150 bg-surface-sunken hover:bg-lagoon-50/20'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="font-semibold text-ink-950">{b.customer?.name}</p>
                        <p className="text-[10px] text-lagoon-700 font-bold">
                          ⏰ {b.start_time}–{b.end_time}
                        </p>
                        <p className="text-[9px] text-ink-500 font-semibold">
                          {b.equipment?.name || 'Watersports unit'}
                        </p>
                      </div>
                      <span className="font-mono text-[9px] text-lagoon-600 bg-white border border-lagoon-200 rounded px-1.5">
                        {b.booking_reference}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Handover column */}
            <div className="rounded-2xl border border-ink-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-ink-100 pb-2">
                <h3 className="text-xs font-bold text-ink-800 uppercase tracking-wide">2. Ready to Hand Over</h3>
                <span className="rounded bg-lagoon-50 px-1.5 py-0.5 text-xxs font-bold text-lagoon-600">
                  {checkedIn.length}
                </span>
              </div>
              {checkedIn.length === 0 ? (
                <p className="text-xxs text-ink-400 py-2">No customers checked-in & waiting at dock.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {checkedIn.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleSelectTodayBooking(b.booking_reference)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                        booking?.id === b.id
                          ? 'border-lagoon-500 bg-lagoon-50/50'
                          : 'border-ink-150 bg-surface-sunken hover:bg-lagoon-50/20'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="font-semibold text-ink-950">{b.customer?.name}</p>
                        <p className="text-[10px] text-lagoon-700 font-bold">
                          ⏰ {b.start_time}–{b.end_time}
                        </p>
                        <p className="text-[9px] text-ink-500 font-semibold">
                          {b.equipment?.name || 'Watersports unit'}
                        </p>
                      </div>
                      <span className="text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5">
                        Paid & Briefed
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* On water column */}
            <div className="rounded-2xl border border-ink-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-ink-100 pb-2">
                <h3 className="text-xs font-bold text-ink-800 uppercase tracking-wide">3. Active on Water</h3>
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xxs font-bold text-blue-600">
                  {inUse.length}
                </span>
              </div>
              {inUse.length === 0 ? (
                <p className="text-xxs text-ink-400 py-2">No active boats currently on the water.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {inUse.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleSelectTodayBooking(b.booking_reference)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                        booking?.id === b.id
                          ? 'border-lagoon-500 bg-lagoon-50/50'
                          : 'border-ink-150 bg-surface-sunken hover:bg-lagoon-50/20'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="font-semibold text-ink-950">{b.customer?.name}</p>
                        <p className="text-[10px] text-lagoon-700 font-bold">
                          ⏰ {b.start_time}–{b.end_time}
                        </p>
                        <p className="text-[9px] text-ink-500 font-semibold">
                          Boat: <span className="font-semibold text-ink-800">{b.equipment?.name}</span>
                        </p>
                      </div>
                      <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 animate-pulse">
                        In Use
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

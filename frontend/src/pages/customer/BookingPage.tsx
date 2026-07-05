import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api, apiErrorMessage } from '../../lib/api'
import type { Equipment, EquipmentType } from '../../types'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { EquipmentIcon } from '../../components/EquipmentIcon'
import { CountUp } from '../../components/ui/CountUp'
import { useAuth } from '../../lib/auth'
import { PublicNavbar } from '../../components/layout/PublicNavbar'
import clsx from 'clsx'


// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_DESCS: Record<EquipmentType, { name: string; desc: string }> = {
  cruise_boat:        { name: 'Cruise Boat',         desc: 'Luxury motorboat for leisurely lake cruises.' },
  kayak_single:       { name: 'Single Kayak',        desc: 'Classic single-seater kayak for solo paddling.' },
  kayak_double:       { name: 'Double Kayak',        desc: 'Two-seater tandem kayak for couples or friends.' },
  canoe:              { name: 'Canoe',                desc: 'Traditional open canoe, great for relaxing cruising.' },
  paddle_boat:        { name: 'Paddle Boat',          desc: 'Standard two-seater foot-pedal boat. Easy and fun.' },
  paddle_boat_family: { name: 'Family Paddle Boat',  desc: 'Four-seater pedal boat ideal for families.' },
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface TypeEntry {
  type: EquipmentType
  name: string
  hourly_rate: string
  desc: string
  count: number
}

interface CalendarSlot {
  start_time: string
  end_time: string
  total_units: number
  available_units: number
  status: 'free' | 'limited' | 'full'
}

interface CartItem {
  equipment_type: EquipmentType
  quantity: number
  booking_date: string
  start_time: string
  end_time: string
  adult_count?: number
  child_count?: number
}


function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Step tracker ─────────────────────────────────────────────────────────────
type Step = 'pick' | 'slot' | 'checkout'

// ─── Main Component ───────────────────────────────────────────────────────────

function BookingPageInner() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  // Fleet
  const [fleet, setFleet] = useState<Equipment[]>([])
  const [loadingFleet, setLoadingFleet] = useState(true)

  // Cart (multi-item)
  const [cart, setCart] = useState<CartItem[]>([])

  // Active slot-picker state (one type at a time)
  const [activeType, setActiveType] = useState<EquipmentType | null>(null)
  const [pickerDate, setPickerDate] = useState(todayISO())
  const [pickerStart, setPickerStart] = useState('09:00')
  const [pickerEnd, setPickerEnd] = useState('10:00')
  const [pickerQty, setPickerQty] = useState(1)
  const [pickerAdults, setPickerAdults] = useState(1)
  const [pickerChildren, setPickerChildren] = useState(0)
  const [calendarSlots, setCalendarSlots] = useState<CalendarSlot[]>([])
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [pickerError, setPickerError] = useState<string | null>(null)

  // Guest details
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')

  // Booking state
  const [booking, setBooking] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ reference: string } | null>(null)

  // Scroll refs
  const pickerRef = useRef<HTMLDivElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)

  // ─── Load fleet ────────────────────────────────────────────────────────────

  useEffect(() => {
    api.get('/equipment')
      .then((res) => setFleet(res.data.data))
      .finally(() => setLoadingFleet(false))
  }, [])

  useEffect(() => {
    const t = searchParams.get('type') as EquipmentType
    if (t && TYPE_DESCS[t]) openPicker(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // ─── Fleet de-dupe by type ─────────────────────────────────────────────────

  const uniqueTypes = useMemo(() => {
    const map = new Map<EquipmentType, TypeEntry>()
    fleet.forEach((item) => {
      if (!map.has(item.type)) {
        map.set(item.type, {
          type: item.type,
          hourly_rate: item.hourly_rate,
          name: TYPE_DESCS[item.type]?.name ?? item.type,
          desc: TYPE_DESCS[item.type]?.desc ?? '',
          count: 0,
        })
      }
      if (item.status === 'available') map.get(item.type)!.count++
    })
    return Array.from(map.values())
  }, [fleet])

  // ─── Calendar ──────────────────────────────────────────────────────────────

  async function fetchCalendar(type: EquipmentType, date: string) {
    setLoadingCalendar(true)
    try {
      const res = await api.post('/availability/calendar', { booking_date: date, type })
      setCalendarSlots(res.data)
    } catch {
      setCalendarSlots([])
    } finally {
      setLoadingCalendar(false)
    }
  }

  // ─── Cart helpers ──────────────────────────────────────────────────────────

  function cartTotal() {
    return cart.reduce((acc, item) => {
      if (item.equipment_type === 'cruise_boat') {
        const adults = item.adult_count ?? 0
        const children = item.child_count ?? 0
        return acc + (adults * 10.00) + (children * 6.00)
      }
      const rate = parseFloat(fleet.find(e => e.type === item.equipment_type)?.hourly_rate ?? '0')
      const [sh, sm] = item.start_time.split(':').map(Number)
      const [eh, em] = item.end_time.split(':').map(Number)
      const hours = Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60)
      return acc + rate * item.quantity * hours
    }, 0)
  }

  function removeCartItem(idx: number) {
    setCart(c => c.filter((_, i) => i !== idx))
  }

  // ─── Picker ────────────────────────────────────────────────────────────────

  // Same-date constraint: first cart item's date is locked for all subsequent items
  const lockedDate = cart.length > 0 ? cart[0].booking_date : null

  function openPicker(type: EquipmentType) {
    const date = lockedDate ?? todayISO()
    setActiveType(type)
    setPickerDate(date)
    setPickerStart('09:00')
    setPickerEnd('10:00')
    setPickerQty(1)
    setPickerAdults(1)
    setPickerChildren(0)
    setPickerError(null)
    setCalendarSlots([])
    fetchCalendar(type, date)
    setTimeout(() => pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
  }

  function closePicker() {
    setActiveType(null)
    setCalendarSlots([])
    setPickerError(null)
  }

  function handleDateChange(date: string) {
    // Enforce same-date constraint
    if (lockedDate && date !== lockedDate) {
      setPickerError(`All items must be booked on the same day (${lockedDate}). Remove existing items to change the date.`)
      return
    }
    setPickerDate(date)
    setPickerStart('09:00')
    setPickerEnd('10:00')
    setPickerError(null)
    if (activeType) fetchCalendar(activeType, date)
  }

  function selectSlot(start: string, end: string) {
    setPickerStart(start)
    setPickerEnd(end)
    setPickerError(null)
  }

  function addToCart() {
    if (!activeType) return

    // Same-date constraint check
    if (lockedDate && pickerDate !== lockedDate) {
      setPickerError(`All items must be booked on the same date (${lockedDate}).`)
      return
    }

    // Validate times
    const [sh, sm] = pickerStart.split(':').map(Number)
    const [eh, em] = pickerEnd.split(':').map(Number)
    if (eh * 60 + em <= sh * 60 + sm) {
      setPickerError('End time must be after start time.')
      return
    }

    if (activeType === 'cruise_boat') {
      if (pickerAdults + pickerChildren === 0) {
        setPickerError('Please select at least 1 passenger.')
        return
      }

      // Merge if same type+date+slot already in cart
      const existing = cart.findIndex(
        c => c.equipment_type === 'cruise_boat' && c.booking_date === pickerDate &&
             c.start_time === pickerStart && c.end_time === pickerEnd
      )

      if (existing >= 0) {
        setCart(prev => prev.map((item, i) =>
          i === existing ? {
            ...item,
            quantity: (item.quantity ?? 0) + pickerAdults + pickerChildren,
            adult_count: (item.adult_count ?? 0) + pickerAdults,
            child_count: (item.child_count ?? 0) + pickerChildren
          } : item
        ))
      } else {
        setCart(prev => [...prev, {
          equipment_type: 'cruise_boat',
          quantity: pickerAdults + pickerChildren,
          adult_count: pickerAdults,
          child_count: pickerChildren,
          booking_date: pickerDate,
          start_time: pickerStart,
          end_time: pickerEnd,
        }])
      }
    } else {
      // Merge if same type+date+slot already in cart
      const existing = cart.findIndex(
        c => c.equipment_type === activeType && c.booking_date === pickerDate &&
             c.start_time === pickerStart && c.end_time === pickerEnd
      )

      if (existing >= 0) {
        setCart(prev => prev.map((item, i) =>
          i === existing ? { ...item, quantity: item.quantity + pickerQty } : item
        ))
      } else {
        setCart(prev => [...prev, {
          equipment_type: activeType,
          quantity: pickerQty,
          booking_date: pickerDate,
          start_time: pickerStart,
          end_time: pickerEnd,
        }])
      }
    }

    closePicker()
    setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
  }

  // ─── Current step logic ────────────────────────────────────────────────────

  const step: Step = activeType ? 'slot' : cart.length > 0 ? 'checkout' : 'pick'

  // ─── Confirm booking ────────────────────────────────────────────────────────

  async function confirmBooking() {
    if (!guestName.trim() || !guestEmail.trim()) {
      setBookingError('Please fill in your name and email address.')
      return
    }
    if (cart.length === 0) {
      setBookingError('Your cart is empty.')
      return
    }

    setBooking(true)
    setBookingError(null)
    try {
      const res = await api.post('/bookings', {
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone || null,
        items: cart,
      })
      setSuccess({ reference: res.data.data.booking_reference })
    } catch (err) {
      setBookingError(apiErrorMessage(err))
    } finally {
      setBooking(false)
    }
  }

  // ─── Success Screen ────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="mx-auto max-w-md text-center py-16">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-3xl border border-ink-200 bg-white p-8 shadow-soft"
        >
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-ink-950">Booking Confirmed!</h2>
          <p className="mt-2 text-sm text-ink-600">
            Your booking has been reserved. Pay at the front desk when you arrive.
          </p>
          <div className="mt-6 rounded-2xl bg-surface-sunken p-4">
            <p className="text-xxs uppercase tracking-wider font-semibold text-ink-500">Booking Reference</p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-lagoon-700">{success.reference}</p>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            {user && (
              <Button onClick={() => navigate('/bookings')} className="w-full">
                View my bookings
              </Button>
            )}
            <Button variant="secondary" className="w-full" onClick={() => { setSuccess(null); setCart([]) }}>
              Make another booking
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }



  // ─── Main Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 relative">
      {/* Sticky Stepper */}
      <div className="sticky top-[58px] z-40 bg-surface-page/95 backdrop-blur-md py-4 border-b border-lagoon-100/35 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between max-w-xl mx-auto border border-ink-150 bg-white px-5 py-3 rounded-2xl shadow-soft">
          {(['pick', 'slot', 'checkout'] as Step[]).map((s, i) => {
            const stepIndex = step === 'pick' ? 0 : step === 'slot' ? 1 : 2
            const isCompleted = i < stepIndex
            const isActive = i === stepIndex
            const isUpcoming = i > stepIndex
            const labels = ['Choose Craft', 'Pick Time', 'Checkout']

            return (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span
                    className={clsx(
                      "grid h-6.5 w-6.5 place-items-center rounded-xl font-bold text-[11px] transition-all duration-300",
                      isCompleted && "bg-emerald-500 text-white shadow-xs",
                      isActive && "bg-lagoon-500 text-white ring-4 ring-lagoon-100/80 scale-105 shadow-sm",
                      isUpcoming && "bg-slate-100 text-slate-400 border border-slate-200/60"
                    )}
                  >
                    {isCompleted ? '✓' : i + 1}
                  </span>
                  <span
                    className={clsx(
                      "hidden sm:inline transition-colors duration-300",
                      isCompleted && "text-emerald-700 font-semibold",
                      isActive && "text-lagoon-800 font-extrabold",
                      isUpcoming && "text-slate-400 font-normal"
                    )}
                  >
                    {labels[i]}
                  </span>
                </div>
                {i < 2 && (
                  <div
                    className={clsx(
                      "h-0.5 flex-1 mx-3 transition-colors duration-500",
                      i < stepIndex ? "bg-emerald-500" : "bg-ink-150"
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px] mt-6">
        {/* Left Column: Interactive Vertical Timeline */}
        <div className="relative pl-8 space-y-10">
          {/* Vertical Animating Path Line */}
          <div className="absolute left-3.5 top-3 bottom-3 w-0.5 bg-ink-150 rounded-full overflow-hidden pointer-events-none">
            <div
              className="absolute top-0 left-0 w-full bg-lagoon-500 shadow-[0_0_8px_rgba(25,150,179,0.3)] transition-all duration-700 ease-in-out"
              style={{
                height: activeType ? '100%' : '50%',
              }}
            />
          </div>

          {/* STEP 1: Choose Craft */}
          <div className="space-y-5 relative">
            {/* Stage Indicator Dot */}
            <span
              className={clsx(
                "absolute -left-8 top-1 grid h-5.5 w-5.5 place-items-center rounded-xl font-bold text-[10px] transition-all duration-500",
                activeType ? "bg-emerald-500 text-white border border-emerald-500" : "bg-lagoon-500 text-white border border-lagoon-500 ring-4 ring-lagoon-100"
              )}
            >
              {activeType ? '✓' : '1'}
            </span>

            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-ink-950">Choose Your Watercraft</h2>
              <p className="text-[11px] text-ink-500">Select an adventure craft from the options below.</p>
            </div>

            {/* Equipment Grid */}
            {loadingFleet ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-2xl bg-lagoon-50" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {uniqueTypes.map((item) => {
                  const inCart = cart.some(c => c.equipment_type === item.type)
                  const isActive = activeType === item.type

                  return (
                    <motion.button
                      key={item.type}
                      onClick={() => isActive ? closePicker() : openPicker(item.type)}
                      whileTap={{ scale: 0.97 }}
                      className={`text-left rounded-3xl border p-5 flex flex-col justify-between min-h-[160px] transition-all relative ${
                        isActive
                          ? 'border-lagoon-500 bg-lagoon-50/70 shadow-soft ring-2 ring-lagoon-200'
                          : inCart
                          ? 'border-emerald-300 bg-emerald-50/50 hover:border-emerald-400'
                          : 'border-ink-200/70 bg-white hover:border-lagoon-200 hover:bg-lagoon-50/40'
                      }`}
                    >
                      {inCart && (
                        <span className="absolute top-3 right-3 h-5 w-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold grid place-items-center">
                          ✓
                        </span>
                      )}
                      <div>
                        <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${isActive ? 'bg-lagoon-500 text-white' : inCart ? 'bg-emerald-100 text-emerald-700' : 'bg-lagoon-50 text-lagoon-600'}`}>
                          <EquipmentIcon type={item.type} className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-semibold text-ink-950">{item.name}</p>
                        <p className="mt-1 text-xs text-ink-500 line-clamp-2 leading-relaxed font-normal">{item.desc}</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                        <span className="text-xs font-bold text-lagoon-700">
                          {item.type === 'cruise_boat' ? 'Adult: RM 10 | Child: RM 6' : `RM ${parseFloat(item.hourly_rate).toFixed(2)}/hr`}
                        </span>
                        <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${item.count > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {item.count > 0 ? `${item.count} avail.` : 'Unavailable'}
                        </span>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Slot Picker Panel */}
          <AnimatePresence>
            {activeType && (
              <motion.div
                ref={pickerRef}
                key="slot-picker"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative space-y-4 scroll-mt-24"
              >
                {/* Stage Indicator Dot */}
                <span className="absolute -left-8 top-1 grid h-5.5 w-5.5 place-items-center rounded-xl font-bold text-[10px] bg-lagoon-500 text-white border border-lagoon-500 ring-4 ring-lagoon-100">
                  2
                </span>

                <div className="space-y-1">
                  <h2 className="text-base font-extrabold text-ink-950">Select Date & Time Slot</h2>
                  <p className="text-[11px] text-ink-500">Pick date, select an hourly slot, set quantity, then add to cart.</p>
                </div>

                <Card className="border-lagoon-200 bg-lagoon-50/20">
                  <CardBody className="pt-5 space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-ink-950 text-sm">
                          Choose a slot — {TYPE_DESCS[activeType]?.name}
                        </h3>
                        <p className="text-xxs text-ink-500 mt-0.5">Select date, click a time block, set quantity, then add to cart.</p>
                      </div>
                      <button onClick={closePicker} className="text-ink-400 hover:text-ink-700 transition-colors text-sm">✕</button>
                    </div>

                    {/* Date picker */}
                    <div className="space-y-1.5">
                      <div className="w-48">
                        <Input
                          label="Date"
                          type="date"
                          min={todayISO()}
                          value={pickerDate}
                          onChange={(e) => handleDateChange(e.target.value)}
                          disabled={!!lockedDate}
                        />
                      </div>
                      {lockedDate && (
                        <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 font-semibold">
                          📅 All items in your cart must be on {lockedDate}. Remove items to change date.
                        </p>
                      )}
                    </div>

                    {/* Calendar Grid */}
                    {loadingCalendar ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <div key={i} className="h-20 animate-pulse rounded-2xl bg-lagoon-50" />
                        ))}
                      </div>
                    ) : calendarSlots.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                        {calendarSlots.map((slot) => {
                          const isSelected = pickerStart === slot.start_time && pickerEnd === slot.end_time
                          const full = slot.status === 'full'

                          let borderClass = 'border-ink-200 hover:border-lagoon-250 bg-white'
                          let badgeClass = 'bg-ink-100 text-ink-700'

                          if (slot.status === 'free') badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          else if (slot.status === 'limited') badgeClass = 'bg-amber-50 text-amber-700 border border-amber-100'
                          else badgeClass = 'bg-red-50 text-red-700 border border-red-100'

                          if (isSelected) borderClass = 'border-lagoon-500 bg-lagoon-50/50 shadow-soft ring-2 ring-lagoon-100'
                          else if (full) borderClass = 'border-red-100 bg-red-50/30 opacity-60 cursor-not-allowed'

                          return (
                            <button
                              key={slot.start_time}
                              type="button"
                              disabled={full}
                              onClick={() => !full && selectSlot(slot.start_time, slot.end_time)}
                              className={`p-3 rounded-2xl border text-left flex flex-col justify-between h-20 transition-all ${borderClass}`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs font-semibold text-ink-950">{slot.start_time}–{slot.end_time}</span>
                                {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-lagoon-500 animate-pulse" />}
                              </div>
                              <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 mt-2 w-max self-start ${badgeClass}`}>
                                {full ? 'Full' : `${slot.available_units}/${slot.total_units} left`}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-ink-500">No timeslots available for this date.</p>
                    )}

                    {/* Manual time entry fallback */}
                    <div className="flex flex-wrap gap-3 items-end">
                      <div className="flex-1 min-w-[120px]">
                        <Input label="Start Time" type="time" value={pickerStart} onChange={e => setPickerStart(e.target.value)} />
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <Input label="End Time" type="time" value={pickerEnd} onChange={e => setPickerEnd(e.target.value)} />
                      </div>
                      {activeType === 'cruise_boat' ? (
                        <>
                          <div className="w-24">
                            <Input
                              label="Adults"
                              type="number"
                              min={0}
                              max={20}
                              value={String(pickerAdults)}
                              onChange={e => setPickerAdults(Math.max(0, parseInt(e.target.value) || 0))}
                            />
                          </div>
                          <div className="w-24">
                            <Input
                              label="Children"
                              type="number"
                              min={0}
                              max={20}
                              value={String(pickerChildren)}
                              onChange={e => setPickerChildren(Math.max(0, parseInt(e.target.value) || 0))}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="w-24">
                          <Input
                            label="Qty"
                            type="number"
                            min={1}
                            max={10}
                            value={String(pickerQty)}
                            onChange={e => setPickerQty(Math.max(1, parseInt(e.target.value) || 1))}
                          />
                        </div>
                      )}
                    </div>

                    {pickerError && <p className="text-xs text-red-600 font-semibold">{pickerError}</p>}

                    <Button className="w-full" onClick={addToCart}>
                      + Add to Cart
                    </Button>
                  </CardBody>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Cart summary + checkout */}
        <div ref={summaryRef} className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardBody className="space-y-4 pt-5">
              <h2 className="font-semibold text-ink-950">Your Reservation</h2>

              {cart.length === 0 && !activeType && (
                <p className="text-xs text-ink-500">Select an equipment category and a time slot to start.</p>
              )}

              <AnimatePresence>
                {cart.map((item, idx) => {
                  const isCruise = item.equipment_type === 'cruise_boat'
                  const rate = parseFloat(fleet.find(e => e.type === item.equipment_type)?.hourly_rate ?? '0')
                  const [sh, sm] = item.start_time.split(':').map(Number)
                  const [eh, em] = item.end_time.split(':').map(Number)
                  const hours = Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60)
                  const lineTotal = isCruise
                    ? ((item.adult_count ?? 0) * 10.00) + ((item.child_count ?? 0) * 6.00)
                    : rate * item.quantity * hours

                  return (
                    <motion.div
                      key={`${item.equipment_type}-${item.booking_date}-${item.start_time}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-start justify-between gap-3 rounded-xl bg-lagoon-50/60 border border-lagoon-100 p-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-lagoon-500 text-white">
                          <EquipmentIcon type={item.equipment_type} className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-ink-900 truncate">
                            {TYPE_DESCS[item.equipment_type]?.name}
                            {isCruise
                              ? ` (${item.adult_count ?? 0} Ad, ${item.child_count ?? 0} Ch)`
                              : ` ×${item.quantity}`}
                          </p>
                          <p className="text-[10px] text-ink-500">{item.booking_date} · {item.start_time}–{item.end_time}</p>
                          <p className="text-[10px] font-semibold text-lagoon-700">RM {lineTotal.toFixed(2)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeCartItem(idx)}
                        className="text-ink-400 hover:text-red-600 text-xs transition-colors flex-shrink-0"
                        aria-label="Remove item"
                      >
                        ✕
                      </button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {cart.length > 0 && (
                <>
                  <div className="flex items-center justify-between rounded-xl bg-surface-sunken px-4 py-3 border-t border-ink-100">
                    <span className="text-xs text-ink-600 font-semibold">Total</span>
                    <CountUp value={cartTotal()} prefix="RM " decimals={2} className="text-base font-bold text-lagoon-700" />
                  </div>

                  {/* Guest contact form */}
                  {!user && (
                    <div className="border-t border-ink-100 pt-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-ink-950 text-xs">Customer Information</h3>
                        <p className="text-[10px] text-ink-500">No account needed. Just your contact details.</p>
                      </div>
                      <Input
                        label="Contact Name"
                        required
                        placeholder="e.g. Harris Rahman"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                      />
                      <Input
                        label="Email Address"
                        type="email"
                        required
                        placeholder="e.g. harris@gmail.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                      />
                      <Input
                        label="Phone Number (optional)"
                        placeholder="e.g. +60133445566"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                      />
                    </div>
                  )}

                  {bookingError && <p className="text-xs text-red-600 font-semibold">{bookingError}</p>}

                  <Button className="w-full" size="lg" loading={booking} onClick={confirmBooking}>
                    Confirm Booking
                  </Button>

                  <p className="text-center text-[10px] text-ink-400">
                    Payment collected at the front desk on arrival.
                  </p>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}



export function BookingPage() {
  return (
    <div className="min-h-screen bg-surface-page flex flex-col text-ink-950">
      {/* Light glass navbar — premium clean look */}
      <PublicNavbar
        position="sticky"
        theme="light"
        cta={
          <a
            href="/"
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-ink-600 hover:text-lagoon-600 hover:bg-lagoon-50 transition-all border border-ink-200/60 shadow-xs"
          >
            ← Back to Home
          </a>
        }
      />

      {/* Light hero strip */}
      <div
        className="relative w-full py-10 px-6 text-center overflow-hidden border-b border-lagoon-100/50"
        style={{ background: 'linear-gradient(180deg, #eefbfd 0%, #f5fbfc 100%)' }}
      >
        {/* subtle soft blue blob */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-50%] left-[20%] w-[60%] h-[200%] rounded-full blur-3xl opacity-40" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)' }} />
        </div>
        <div className="relative z-10">
          <span className="inline-block mb-3 rounded-full bg-lagoon-100 text-lagoon-700 border border-lagoon-200/50 px-4 py-1 text-[10px] font-bold uppercase tracking-widest">
            🌊 Antan Batura Watersports
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-ink-950 font-display">Book Your Adventure</h1>
          <p className="mt-2 text-sm text-ink-600 max-w-md mx-auto">
            Pick your watercraft, choose a time slot, and secure your spot on the lake.
          </p>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 sm:px-6">
        <BookingPageInner />
      </div>

      {/* Footer */}
      <footer className="border-t border-ink-150 py-5 text-center text-[10px] text-ink-400 bg-white/40">
        © 2026 Antan Batura Watersports Tasik Shah Alam. All rights reserved.
      </footer>
    </div>
  )
}


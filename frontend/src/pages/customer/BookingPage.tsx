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

const TYPE_LABELS: Record<EquipmentType, string> = {
  cruise_boat: 'Cruise Boat',
  kayak_single: 'Single Kayak',
  kayak_double: 'Double Kayak',
  canoe: 'Canoe',
  paddle_boat: 'Paddle Boat',
  paddle_boat_family: 'Family Paddle Boat',
}

const TYPE_DESCS: Record<EquipmentType, { name: string; desc: string }> = {
  cruise_boat: { name: 'Cruise Boat', desc: 'Luxury motorboat for leisurely lake cruises.' },
  kayak_single: { name: 'Single Kayak', desc: 'Classic single-seater kayak for solo paddling.' },
  kayak_double: { name: 'Double Kayak', desc: 'Two-seater tandem kayak for couples or friends.' },
  canoe: { name: 'Canoe', desc: 'Traditional open canoe, great for slow, relaxing cruising.' },
  paddle_boat: { name: 'Paddle Boat', desc: 'Standard two-seater foot-pedal boat. Easy and fun.' },
  paddle_boat_family: { name: 'Family Paddle Boat', desc: 'Four-seater pedal boat ideal for families and groups.' },
}

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


function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function BookingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  
  const [fleet, setFleet] = useState<Equipment[]>([])
  const [loadingFleet, setLoadingFleet] = useState(true)
  
  const [selectedType, setSelectedType] = useState<EquipmentType | null>(null)
  const [assignedEquipment, setAssignedEquipment] = useState<Equipment | null>(null)

  useEffect(() => {
    const t = searchParams.get('type') as EquipmentType
    if (t && ['cruise_boat', 'kayak_single', 'kayak_double', 'canoe', 'paddle_boat', 'paddle_boat_family'].includes(t)) {
      setSelectedType(t)
    }
  }, [searchParams])

  const [date, setDate] = useState(todayISO())
  const [start, setStart] = useState('10:00')
  const [end, setEnd] = useState('11:00')

  // Guest Details States
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')

  // Availability & Calendar states
  const [calendarSlots, setCalendarSlots] = useState<CalendarSlot[]>([])
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  
  const [error, setError] = useState<string | null>(null)
  const [booking, setBooking] = useState(false)
  const [success, setSuccess] = useState<{ reference: string; waitlisted: boolean } | null>(null)

  const checkRequestId = useRef(0)

  useEffect(() => {
    api
      .get('/equipment')
      .then((res) => setFleet(res.data.data))
      .finally(() => setLoadingFleet(false))
  }, [])

  const uniqueTypes = useMemo(() => {
    const typesMap = new Map<EquipmentType, TypeEntry>()
    
    fleet.forEach((item) => {
      if (!typesMap.has(item.type)) {
        const metadata = TYPE_DESCS[item.type] || { name: TYPE_LABELS[item.type], desc: 'Watersports rental equipment' }
        typesMap.set(item.type, {
          type: item.type,
          name: metadata.name,
          hourly_rate: item.hourly_rate,
          desc: metadata.desc,
          count: 0
        })
      }
      if (item.status === 'available') {
        typesMap.get(item.type)!.count++
      }
    })
    
    return Array.from(typesMap.values())
  }, [fleet])

  const hours = useMemo(() => {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const diff = (eh * 60 + em - (sh * 60 + sm)) / 60
    return diff > 0 ? diff : 0
  }, [start, end])

  const estimatedCost = useMemo(() => {
    if (!selectedType) return 0
    const matched = fleet.find(item => item.type === selectedType)
    const hourlyRate = matched ? parseFloat(String(matched.hourly_rate)) : 0
    return isNaN(hourlyRate) ? 0 : hourlyRate * hours
  }, [selectedType, fleet, hours])

  // Fetch the full visual timeslots board for the day
  async function fetchCalendarSlots() {
    if (!selectedType || !date) return
    setLoadingCalendar(true)
    try {
      const res = await api.post('/availability/calendar', {
        booking_date: date,
        type: selectedType,
      })
      setCalendarSlots(res.data)
    } catch (err) {
      console.error("Failed to load availability calendar", err)
    } finally {
      setLoadingCalendar(false)
    }
  }

  useEffect(() => {
    fetchCalendarSlots()
    resetCheck()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, selectedType])

  function resetCheck() {
    checkRequestId.current++
    setAvailable(null)
    setError(null)
    setAssignedEquipment(null)
  }

  function selectType(type: EquipmentType) {
    resetCheck()
    setSelectedType(type)
    setSuccess(null)
  }

  async function handleSelectSlot(slotStart: string, slotEnd: string) {
    setStart(slotStart)
    setEnd(slotEnd)
    
    // Auto-check availability for this specific slot to reserve a physical ID
    if (!selectedType) return
    const requestId = ++checkRequestId.current
    setChecking(true)
    setError(null)
    setAvailable(null)
    setAssignedEquipment(null)
    
    try {
      const res = await api.post('/availability/check', {
        type: selectedType,
        booking_date: date,
        start_time: slotStart,
        end_time: slotEnd,
      })
      if (requestId !== checkRequestId.current) return
      setAvailable(res.data.available)
      if (res.data.available && res.data.equipment && res.data.equipment.length > 0) {
        setAssignedEquipment(res.data.equipment[0])
      } else {
        setAssignedEquipment(null)
      }
    } catch (err) {
      if (requestId !== checkRequestId.current) return
      setError(apiErrorMessage(err))
    } finally {
      if (requestId === checkRequestId.current) setChecking(false)
    }
  }

  async function confirmBooking(waitlist = false) {
    if (!selectedType) return
    
    let targetEquipmentId: number | null = null
    if (waitlist) {
      const rep = fleet.find(item => item.type === selectedType)
      if (rep) targetEquipmentId = rep.id
    } else {
      if (assignedEquipment) targetEquipmentId = assignedEquipment.id
    }
    
    if (!targetEquipmentId) {
      setError('No equipment unit could be assigned. Please try another slot.')
      return
    }

    // If guest, validate input
    if (!user) {
      if (!guestName.trim() || !guestEmail.trim()) {
        setError('Please fill in your contact name and email address.')
        return
      }
    }

    setBooking(true)
    setError(null)
    try {
      const res = await api.post('/bookings', {
        equipment_id: targetEquipmentId,
        booking_date: date,
        start_time: start,
        end_time: end,
        waitlist,
        guest_name: user ? undefined : guestName,
        guest_email: user ? undefined : guestEmail,
        guest_phone: user ? undefined : guestPhone || null,
      })
      setSuccess({ reference: res.data.data.booking_reference, waitlisted: res.data.data.waitlisted })
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBooking(false)
    }
  }

  if (success) {
    const { reference, waitlisted } = success
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
          <h2 className="text-xl font-semibold text-ink-950">
            {waitlisted ? 'Waitlist Joined' : 'Booking Successful!'}
          </h2>
          <p className="mt-2 text-sm text-ink-600">
            {waitlisted
              ? 'This slot was occupied, but you have successfully joined the waitlist.'
              : 'Your booking has been reserved. Please pay at the front desk when checking in.'}
          </p>

          <div className="mt-6 rounded-2xl bg-surface-sunken p-4">
            <p className="text-xxs uppercase tracking-wider font-semibold text-ink-500">Booking Reference</p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-lagoon-700">{reference}</p>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {user ? (
              <Button onClick={() => navigate('/bookings')} className="w-full">
                View my bookings
              </Button>
            ) : (
              <p className="text-xxs text-ink-500 border border-ink-150 rounded-lg p-2 bg-surface-sunken">
                Write down your Booking Reference ID. Present it at the desk to complete checkout.
              </p>
            )}
            <Button variant="secondary" onClick={() => { setSuccess(null); setSelectedType(null); }} className="w-full">
              Make another booking
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
      {/* Left Column: Equipment Categories */}
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink-950">Book equipment</h1>
          <p className="mt-1 text-ink-600">Select a category of watersports equipment to view availability.</p>
        </div>

        {loadingFleet ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-lagoon-50" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uniqueTypes.map((item) => (
              <motion.button
                key={item.type}
                onClick={() => selectType(item.type)}
                whileTap={{ scale: 0.97 }}
                className={`text-left rounded-3xl border p-5 flex flex-col justify-between min-h-[160px] transition-all ${
                  selectedType === item.type
                    ? 'border-lagoon-400 bg-lagoon-50 shadow-soft'
                    : 'border-ink-200/70 bg-white hover:border-lagoon-200 hover:bg-lagoon-50/40'
                }`}
              >
                <div>
                  <div
                    className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${
                      selectedType === item.type ? 'bg-lagoon-500 text-white' : 'bg-lagoon-50 text-lagoon-600'
                    }`}
                  >
                    <EquipmentIcon type={item.type} className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-ink-950">{item.name}</p>
                  <p className="mt-1 text-xs text-ink-500 line-clamp-2 leading-relaxed">{item.desc}</p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                  <span className="text-sm font-bold text-lagoon-700">RM {parseFloat(item.hourly_rate).toFixed(2)}/hr</span>
                  <span
                    className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${
                      item.count > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {item.count > 0 ? `${item.count} in fleet` : 'Unavailable'}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {/* Visual Slot Selector Calendar Card */}
        {selectedType && (
          <Card className="border-lagoon-100 bg-lagoon-50/10">
            <CardBody className="pt-5 space-y-4">
              <div>
                <h3 className="font-semibold text-ink-950 text-sm">Select Booking Time</h3>
                <p className="text-xxs text-ink-500">Click a time slot to reserve. Red slots are fully booked.</p>
              </div>

              <div className="w-48">
                <Input
                  label="Date"
                  type="date"
                  min={todayISO()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {loadingCalendar ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-2xl bg-lagoon-50" />
                  ))}
                </div>
              ) : calendarSlots.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {calendarSlots.map((slot) => {
                    const isSelected = start === slot.start_time && end === slot.end_time

                    let borderClass = 'border-ink-200 hover:border-lagoon-250 bg-white'
                    let badgeClass = 'bg-ink-100 text-ink-700'
                    let statusText = `${slot.available_units}/${slot.total_units} left`

                    if (slot.status === 'free') {
                      badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    } else if (slot.status === 'limited') {
                      badgeClass = 'bg-amber-50 text-amber-700 border border-amber-100'
                    } else {
                      badgeClass = 'bg-red-50 text-red-700 border border-red-100 font-bold'
                      statusText = 'Full'
                    }

                    if (isSelected) {
                      borderClass = 'border-lagoon-500 bg-lagoon-50/50 shadow-soft'
                    }

                    return (
                      <button
                        key={slot.start_time}
                        type="button"
                        onClick={() => handleSelectSlot(slot.start_time, slot.end_time)}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between h-20 transition-all ${borderClass}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-semibold text-ink-950">{slot.start_time}–{slot.end_time}</span>
                          {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-lagoon-500 animate-ripple" />}
                        </div>
                        <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 mt-2 w-max self-start ${badgeClass}`}>
                          {statusText}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-ink-500">Unable to generate timeslots calendar.</p>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Right Column: Checkout & Contact Panel */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardBody className="space-y-4 pt-5">
            <h2 className="font-semibold text-ink-950">Your Reservation</h2>

            {!selectedType && <p className="text-sm text-ink-500">Select an equipment category to start.</p>}

            {selectedType && (
              <>
                <div className="flex items-center gap-3 rounded-xl bg-lagoon-50 p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-lagoon-500 text-white">
                    <EquipmentIcon type={selectedType} className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-950">{TYPE_DESCS[selectedType]?.name}</p>
                    <p className="text-xs text-ink-500">
                      RM {parseFloat(String(fleet.find(i => i.type === selectedType)?.hourly_rate || 0)).toFixed(2)}/hr
                    </p>
                  </div>
                </div>

                <div className="border-t border-ink-100 pt-3 space-y-2">
                  <p className="text-xxs uppercase tracking-wider font-semibold text-ink-400">Selected Slot</p>
                  <p className="text-xs font-semibold text-ink-900">
                    📅 {date} @ ⏰ {start}–{end} ({hours} {hours === 1 ? 'hour' : 'hours'})
                  </p>
                </div>

                {hours > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-surface-sunken px-4 py-3">
                    <span className="text-sm text-ink-600">Estimated cost</span>
                    <CountUp value={estimatedCost} prefix="RM " decimals={2} className="text-lg font-semibold text-lagoon-700" />
                  </div>
                )}

                {/* Guest Contact Information Form */}
                {!user && (
                  <div className="border-t border-ink-100 pt-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-ink-950 text-xs">Customer Information</h3>
                      <p className="text-[10px] text-ink-500">Complete checkout details without registering.</p>
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

                {error && <p className="text-xs text-red-600">{error}</p>}

                {checking && (
                  <div className="flex items-center justify-center py-2 text-xs font-medium text-lagoon-600 gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-lagoon-200 border-t-lagoon-600" />
                    Checking slot...
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {available === true && !checking && (
                    <motion.div
                      key="available"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <Button className="w-full" size="lg" loading={booking} onClick={() => confirmBooking(false)}>
                        Confirm Booking
                      </Button>
                    </motion.div>
                  )}

                  {available === false && !checking && (
                    <motion.div
                      key="unavailable"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <p className="text-xs font-medium text-amber-700 leading-relaxed">
                        This slot is fully booked for {TYPE_LABELS[selectedType]}. Join the waitlist to be queued if a slot opens up.
                      </p>
                      <Button variant="secondary" className="w-full" loading={booking} onClick={() => confirmBooking(true)}>
                        Join Waitlist
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

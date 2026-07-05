import { useEffect, useState } from 'react'
import { api, apiErrorMessage } from '../../lib/api'
import type { Booking, BookingItem, Equipment } from '../../types'
import { Card, CardBody } from '../ui/Card'
import { Button } from '../ui/Button'
import { EquipmentIcon } from '../EquipmentIcon'
import { PaymentStep } from './PaymentStep'
import { ReceiptSummary } from './ReceiptSummary'
import clsx from 'clsx'


// ─── Individual Timer Component for each Active Item ────────────────────────

function ItemTimer({ item }: { item: BookingItem }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [item.id, item.handed_over_at])

  const startedAt = item.handed_over_at ? new Date(item.handed_over_at) : null
  if (!startedAt) return null

  // Calculate booked minutes
  const [sh, sm] = item.start_time.split(':').map(Number)
  const [eh, em] = item.end_time.split(':').map(Number)
  const bookedMinutes = eh * 60 + em - (sh * 60 + sm)

  const elapsedMs = now.getTime() - startedAt.getTime()
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000))
  const elapsedSeconds = Math.max(0, Math.floor((elapsedMs / 1000) % 60))
  const isOvertime = elapsedMinutes > bookedMinutes

  return (
    <div className="flex items-center gap-2 rounded-xl bg-lagoon-50/50 px-3.5 py-2.5 border border-lagoon-100 text-xs">
      <span className="h-2.5 w-2.5 rounded-full bg-lagoon-500 animate-pulse" />
      <div>
        <span className="font-semibold text-ink-950">Elapsed: </span>
        <span className="font-mono font-bold text-lagoon-700">
          {elapsedMinutes}:{elapsedSeconds.toString().padStart(2, '0')}
        </span>
        <span className="text-ink-500"> of {bookedMinutes} min</span>
        {isOvertime && (
          <span className="block mt-0.5 text-xxs font-bold text-amber-600">
            ⚠️ Overtime: {elapsedMinutes - bookedMinutes} min (overtime rate applies)
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main Booking Workflow Component ────────────────────────────────────────

export function BookingWorkflow({ booking, onUpdate }: { booking: Booking; onUpdate: (b: Booking) => void }) {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [loadingEquipment, setLoadingEquipment] = useState(false)

  // Checked-in state per item ID
  const [briefing, setBriefing] = useState<Record<number, boolean>>({})
  const [gear, setGear] = useState<Record<number, boolean>>({})
  const [selectedUnits, setSelectedUnits] = useState<Record<number, number[]>>({})

  // Return state per item ID
  const [condition, setCondition] = useState<Record<number, 'good' | 'damaged'>>({})
  const [damageDesc, setDamageDesc] = useState<Record<number, string>>({})
  const [depositCharged, setDepositCharged] = useState<Record<number, string>>({})

  // Loading states
  const [actionsLoading, setActionsLoading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  // Fetch all equipment for unit assignment
  useEffect(() => {
    setLoadingEquipment(true)
    api.get('/equipment')
      .then(res => setEquipmentList(res.data.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoadingEquipment(false))
  }, [])

  // Helper: set individual loading state
  function setLoadingKey(key: string, val: boolean) {
    setActionsLoading(prev => ({ ...prev, [key]: val }))
  }

  // Action: Check in item
  async function handleCheckIn(item: BookingItem) {
    const units = selectedUnits[item.id] || []
    if (units.length !== item.quantity) {
      alert(`Please select exactly ${item.quantity} unit(s).`)
      return
    }

    setLoadingKey(`checkin-${item.id}`, true)
    setError(null)
    try {
      const res = await api.post(`/bookings/${booking.id}/items/${item.id}/check-in`, {
        safety_briefing_given: briefing[item.id] || false,
        safety_gear_issued: gear[item.id] || false,
        unit_ids: units,
      })
      onUpdate(res.data.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoadingKey(`checkin-${item.id}`, false)
    }
  }

  // Action: Hand over item
  async function handleHandOver(item: BookingItem) {
    setLoadingKey(`handover-${item.id}`, true)
    setError(null)
    try {
      const res = await api.post(`/bookings/${booking.id}/items/${item.id}/hand-over`)
      onUpdate(res.data.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoadingKey(`handover-${item.id}`, false)
    }
  }

  // Action: Return item
  async function handleReturn(item: BookingItem) {
    const cond = condition[item.id] || 'good'
    const desc = damageDesc[item.id] || ''
    const dep = parseFloat(depositCharged[item.id] || '0')

    if (cond === 'damaged' && !desc.trim()) {
      alert('Please describe the damage.')
      return
    }

    setLoadingKey(`return-${item.id}`, true)
    setError(null)
    try {
      const res = await api.post(`/bookings/${booking.id}/items/${item.id}/return`, {
        condition_on_return: cond,
        damage_description: cond === 'damaged' ? desc : undefined,
        deposit_charged: cond === 'damaged' ? dep : undefined,
      })
      onUpdate(res.data.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoadingKey(`return-${item.id}`, false)
    }
  }

  // Action: Cancel item
  async function handleCancelItem(item: BookingItem) {
    if (!window.confirm(`Are you sure you want to cancel the ${item.equipment_type.replace('_', ' ')} item?`)) return
    setLoadingKey(`cancel-${item.id}`, true)
    setError(null)
    try {
      const res = await api.post(`/bookings/${booking.id}/items/${item.id}/cancel`)
      onUpdate(res.data.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoadingKey(`cancel-${item.id}`, false)
    }
  }

  // Filter units of matching type
  function getUnitsForType(type: string) {
    return equipmentList.filter(e => e.type === type)
  }

  // Check if at least one item is checked in or in use to collect payment
  const hasActiveItem = booking.items?.some(i => i.item_status !== 'confirmed' && i.item_status !== 'pending' && i.item_status !== 'cancelled')
  const showPaymentCollector = booking.payment_status !== 'confirmed' && hasActiveItem && booking.status !== 'cancelled'

  if (booking.status === 'cancelled') {
    return <ReceiptSummary booking={booking} />
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-700 border border-red-100">
          {error}
        </div>
      )}

      {/* Booking Payment Box (At least one item checked-in) */}
      {showPaymentCollector && (
        <PaymentStep
          booking={booking}
          suggestedAmount={booking.total_amount || 0}
          purpose="booking"
          onConfirmed={async () => {
            const res = await api.get(`/bookings/${booking.id}`)
            onUpdate(res.data.data)
          }}
        />
      )}

      {/* Checklist of Items */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-ink-800 uppercase tracking-wider">Watercraft Session Items</h2>
        
        {booking.items?.map((item) => {
          const isCancelled = item.item_status === 'cancelled'
          const isCompleted = item.item_status === 'completed'
          const isPending = item.item_status === 'pending' || item.item_status === 'confirmed'
          const isCheckedIn = item.item_status === 'checked_in'
          const isInUse = item.item_status === 'in_use'

          // Get matching equipment units
          const units = getUnitsForType(item.equipment_type)
          const currentSelection = selectedUnits[item.id] || []

          function toggleUnitSelection(unitId: number) {
            setSelectedUnits(prev => {
              const current = prev[item.id] || []
              if (current.includes(unitId)) {
                return { ...prev, [item.id]: current.filter(id => id !== unitId) }
              } else {
                if (current.length >= item.quantity) {
                  // Limit selection to item quantity
                  return { ...prev, [item.id]: [...current.slice(1), unitId] }
                }
                return { ...prev, [item.id]: [...current, unitId] }
              }
            })
          }

          return (
            <Card key={item.id} className={clsx(
              "border shadow-sm transition-all",
              isInUse ? "border-blue-200 bg-blue-50/10" : isCancelled ? "opacity-60 border-ink-150" : "border-ink-200"
            )}>
              <CardBody className="p-5 space-y-4">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      "grid h-10 w-10 place-items-center rounded-xl",
                      isInUse ? "bg-blue-500 text-white" : "bg-lagoon-50 text-lagoon-600"
                    )}>
                      <EquipmentIcon type={item.equipment_type} className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink-950 capitalize">
                        {item.equipment_type.replace('_', ' ')} · Qty: {item.quantity}
                      </p>
                      <p className="text-xxs text-ink-500 mt-0.5">
                        📅 {item.booking_date} · ⏰ {item.start_time}–{item.end_time}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="capitalize text-[10px] font-bold px-2 py-0.5 rounded-md border bg-white shadow-sm">
                      {item.item_status.replace('_', ' ')}
                    </span>
                    {!isCancelled && !isCompleted && !isInUse && (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={actionsLoading[`cancel-${item.id}`]}
                        onClick={() => handleCancelItem(item)}
                        className="text-red-650 hover:bg-red-50"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>

                {/* Assigned Units display if already assigned */}
                {item.assigned_units && item.assigned_units.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-ink-100">
                    <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider self-center mr-1">Units:</span>
                    {item.assigned_units.map((u) => (
                      <span key={u.id} className="text-xxs font-semibold bg-white border border-ink-200 rounded px-1.5 py-0.5">
                        {u.equipment_unit?.name || `Unit #${u.equipment_unit_id}`}
                      </span>
                    ))}
                  </div>
                )}

                {/* 1. Check-In Form (Pending / Confirmed) */}
                {isPending && (
                  <div className="space-y-3 pt-3 border-t border-ink-150">
                    <p className="text-[10px] font-bold text-lagoon-700 uppercase tracking-wider">Step 1: Inspect & Assign Units</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded accent-lagoon-600"
                          checked={briefing[item.id] || false}
                          onChange={(e) => setBriefing(prev => ({ ...prev, [item.id]: e.target.checked }))}
                        />
                        Briefing Completed
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded accent-lagoon-600"
                          checked={gear[item.id] || false}
                          onChange={(e) => setGear(prev => ({ ...prev, [item.id]: e.target.checked }))}
                        />
                        Safety Gear Issued
                      </label>
                    </div>

                    {/* Unit Selector */}
                    {loadingEquipment ? (
                      <p className="text-[10px] text-ink-400">Loading units...</p>
                    ) : (
                      <div className="space-y-1.5">
                        <span className="text-xxs text-ink-500 font-bold">Select Physical Watercraft IDs ({item.quantity} required):</span>
                        <div className="flex flex-wrap gap-1.5">
                          {units.map((u) => {
                            const isSelected = currentSelection.includes(u.id)
                            const isMaintenance = u.status === 'maintenance'
                            return (
                              <button
                                key={u.id}
                                disabled={isMaintenance}
                                onClick={() => toggleUnitSelection(u.id)}
                                className={clsx(
                                  "text-xxs font-semibold rounded px-2.5 py-1.5 border transition-all",
                                  isSelected
                                    ? "bg-lagoon-500 text-white border-lagoon-600 shadow"
                                    : isMaintenance
                                    ? "bg-red-50 text-red-400 border-red-100 cursor-not-allowed opacity-50"
                                    : "bg-white hover:bg-surface-sunken text-ink-700 border-ink-200"
                                )}
                              >
                                {u.name} {isMaintenance && '(Maint.)'}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <Button
                      className="w-full"
                      loading={actionsLoading[`checkin-${item.id}`]}
                      disabled={!(briefing[item.id] && gear[item.id]) || currentSelection.length !== item.quantity}
                      onClick={() => handleCheckIn(item)}
                    >
                      Confirm Check-In
                    </Button>
                  </div>
                )}

                {/* 2. Handover Button (Checked In) */}
                {isCheckedIn && (
                  <div className="pt-3 border-t border-ink-150 space-y-2">
                    <p className="text-[10px] font-bold text-lagoon-700 uppercase tracking-wider">Step 2: Handover to Customer</p>
                    {booking.payment_status !== 'confirmed' ? (
                      <p className="text-xs text-amber-700 font-medium">
                        ⚠️ Collect payment above before handing over equipment.
                      </p>
                    ) : (
                      <Button
                        className="w-full"
                        loading={actionsLoading[`handover-${item.id}`]}
                        onClick={() => handleHandOver(item)}
                      >
                        Hand Over & Start Timer
                      </Button>
                    )}
                  </div>
                )}

                {/* 3. Return Form & Timer (In Use) */}
                {isInUse && (
                  <div className="pt-3 border-t border-ink-150 space-y-4">
                    <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Step 3: Usage Timer & Return</p>
                    
                    <ItemTimer item={item} />

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setCondition(prev => ({ ...prev, [item.id]: 'good' }))}
                          className={clsx(
                            "py-2 rounded-xl text-xs font-semibold border transition-all",
                            (condition[item.id] || 'good') === 'good'
                              ? "border-emerald-400 bg-emerald-50 text-emerald-800 font-bold"
                              : "border-ink-200 bg-white text-ink-600 hover:bg-surface-sunken"
                          )}
                        >
                          Good Condition
                        </button>
                        <button
                          onClick={() => setCondition(prev => ({ ...prev, [item.id]: 'damaged' }))}
                          className={clsx(
                            "py-2 rounded-xl text-xs font-semibold border transition-all",
                            condition[item.id] === 'damaged'
                              ? "border-red-400 bg-red-50 text-red-800 font-bold"
                              : "border-ink-200 bg-white text-ink-600 hover:bg-surface-sunken"
                          )}
                        >
                          Damaged
                        </button>
                      </div>

                      {condition[item.id] === 'damaged' && (
                        <div className="space-y-2 rounded-xl bg-red-50/60 p-3.5 border border-red-150">
                          <label className="block text-[10px] font-bold text-ink-700 uppercase">Damage Description</label>
                          <textarea
                            value={damageDesc[item.id] || ''}
                            onChange={(e) => setDamageDesc(prev => ({ ...prev, [item.id]: e.target.value }))}
                            rows={2}
                            placeholder="Describe damage, cracked hulls, lost paddles..."
                            className="w-full text-xs rounded-xl border border-ink-200 bg-white px-3 py-2"
                          />
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-ink-700 uppercase">Deposit Charged (RM)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={depositCharged[item.id] || '50.00'}
                              onChange={(e) => setDepositCharged(prev => ({ ...prev, [item.id]: e.target.value }))}
                              className="w-full text-xs rounded-xl border border-ink-200 bg-white px-3 py-2"
                            />
                          </div>
                        </div>
                      )}

                      <Button
                        className="w-full"
                        loading={actionsLoading[`return-${item.id}`]}
                        onClick={() => handleReturn(item)}
                      >
                        Register Return & Close
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )
        })}
      </div>

      {booking.status === 'completed' && (
        <ReceiptSummary booking={booking} />
      )}
    </div>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import { api, apiErrorMessage } from '../../lib/api'
import type { Equipment, EquipmentStatus, EquipmentType } from '../../types'
import { useAuth } from '../../lib/auth'
import { Card, CardBody } from '../../components/ui/Card'
import { StatusPill } from '../../components/ui/StatusPill'
import { EquipmentIcon } from '../../components/EquipmentIcon'
import { Select, Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

const TYPE_LABELS: Record<EquipmentType, string> = {
  cruise_boat: 'Cruise Boat',
  kayak_single: 'Single Kayak',
  kayak_double: 'Double Kayak',
  canoe: 'Canoe',
  paddle_boat: 'Paddle Boat',
  paddle_boat_family: 'Family Paddle Boat',
}

const STATUS_OPTIONS: EquipmentStatus[] = ['available', 'booked', 'maintenance']

export function FleetPage() {
  const { user } = useAuth()
  const [fleet, setFleet] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const isAdmin = user?.role === 'admin'
  const canEdit = user?.role === 'admin' || user?.role === 'staff'

  // Form states for creating / editing
  const [editingItem, setEditingItem] = useState<Equipment | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<EquipmentType>('kayak_single')
  const [hourlyRate, setHourlyRate] = useState('')
  const [notes, setNotes] = useState('')

  function fetchFleet() {
    api
      .get('/equipment')
      .then((res) => setFleet(res.data.data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchFleet()
  }, [])

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setSubmitting(true)
    try {
      const payload = {
        name,
        type,
        hourly_rate: Number(hourlyRate),
        notes: notes || null,
      }

      if (editingItem) {
        // Edit flow
        const res = await api.patch(`/equipment/${editingItem.id}`, {
          ...payload,
          status: editingItem.status,
        })
        setFleet((prev) => prev.map((e) => (e.id === editingItem.id ? res.data.data : e)))
        setSuccessMsg(`Successfully updated ${name}.`)
        setEditingItem(null)
      } else {
        // Create flow
        await api.post('/equipment', payload)
        setSuccessMsg(`Successfully registered ${name} to fleet.`)
        fetchFleet()
      }

      // Reset form fields
      setName('')
      setHourlyRate('')
      setNotes('')
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(item: Equipment) {
    setEditingItem(item)
    setName(item.name)
    setType(item.type)
    setHourlyRate(String(item.hourly_rate))
    setNotes(item.notes || '')
  }

  function cancelEdit() {
    setEditingItem(null)
    setName('')
    setHourlyRate('')
    setNotes('')
  }

  async function handleDelete(item: Equipment) {
    if (!window.confirm(`Are you sure you want to completely remove ${item.name} from inventory?`)) return
    setError(null)
    setSuccessMsg(null)
    try {
      await api.delete(`/equipment/${item.id}`)
      setSuccessMsg(`${item.name} has been removed from inventory.`)
      fetchFleet()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  async function updateStatus(item: Equipment, status: EquipmentStatus) {
    setSavingId(item.id)
    setError(null)
    try {
      const res = await api.patch(`/equipment/${item.id}/status`, { status })
      setFleet((prev) => prev.map((e) => (e.id === item.id ? res.data.data : e)))
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSavingId(null)
    }
  }

  const grouped = fleet.reduce<Record<string, Equipment[]>>((acc, item) => {
    (acc[item.type] ??= []).push(item)
    return acc
  }, {})

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {/* Left Column: Fleet List */}
      <div>
        <h1 className="text-2xl font-semibold text-ink-950">Fleet Management</h1>
        <p className="mt-1 text-ink-600">Monitor and update active statuses for the {fleet.length} rental units in our fleet.</p>
        
        {successMsg && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-700">
            {successMsg}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3.5 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-lagoon-50" />
            ))}
          </div>
        ) : (
          Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="mt-8">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-500">
                {TYPE_LABELS[type as EquipmentType]}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((item) => (
                  <Card key={item.id} className="hover:border-lagoon-200 transition-colors">
                    <CardBody className="pt-4 pb-4 flex flex-col justify-between h-full">
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <div className="grid h-9 w-9 place-items-center rounded-lg bg-lagoon-50 text-lagoon-600">
                            <EquipmentIcon type={item.type} className="h-4.5 w-4.5" />
                          </div>
                          <StatusPill status={item.status} />
                        </div>
                        <p className="text-xs font-bold text-ink-950 leading-tight">{item.name}</p>
                        <p className="text-[10px] text-ink-500 font-semibold mt-0.5">RM {parseFloat(String(item.hourly_rate)).toFixed(2)}/hr</p>
                      </div>

                      <div className="mt-4 space-y-2">
                        {canEdit && (
                          <Select
                            className="text-[10px] py-1"
                            value={item.status}
                            disabled={savingId === item.id}
                            onChange={(e) => updateStatus(item, e.target.value as EquipmentStatus)}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </option>
                            ))}
                          </Select>
                        )}

                        {isAdmin && (
                          <div className="flex gap-1.5 pt-1.5 border-t border-ink-100">
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              className="text-[10px] font-bold text-lagoon-600 hover:text-lagoon-850 hover:bg-lagoon-50 rounded px-1.5 py-1 transition-colors flex-1 text-center border border-transparent hover:border-lagoon-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              className="text-[10px] font-bold text-red-500 hover:text-red-750 hover:bg-red-50 rounded px-1.5 py-1 transition-colors flex-1 text-center border border-transparent hover:border-red-100"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Right Column: Register/Edit Panel (Admin Only) */}
      {isAdmin && (
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardBody className="pt-5 space-y-4">
              <h2 className="font-semibold text-ink-950 text-sm">
                {editingItem ? `Edit unit: ${editingItem.name}` : 'Register Watercraft'}
              </h2>
              <p className="text-xxs text-ink-500">
                {editingItem 
                  ? 'Modify active hourly billing rates, names, or watercraft type groups.'
                  : 'Add a new watercraft unit to the rental inventory database.'
                }
              </p>

              <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
                <Input
                  label="Watercraft Name"
                  required
                  placeholder="e.g. Single Kayak #7"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-700">Category Group</label>
                  <Select
                    value={type}
                    onChange={(e) => setType(e.target.value as EquipmentType)}
                  >
                    {Object.entries(TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </Select>
                </div>

                <Input
                  label="Hourly Rental Rate (RM)"
                  required
                  type="number"
                  step="0.01"
                  placeholder="e.g. 15.00"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-700">Admin Notes (optional)</label>
                  <textarea
                    className="w-full text-xs border border-ink-200 rounded-xl p-2.5 bg-white text-ink-950 focus:outline-none focus:border-lagoon-500 placeholder-ink-400"
                    placeholder="e.g. Sourced from vendor B in June 2026"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  {editingItem && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-1/3"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" className="flex-1" size="lg" loading={submitting}>
                    {editingItem ? 'Save Changes' : 'Register Unit'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}

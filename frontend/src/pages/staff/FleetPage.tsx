import { useEffect, useState } from 'react'
import { api, apiErrorMessage } from '../../lib/api'
import type { Equipment, EquipmentStatus, EquipmentType } from '../../types'
import { useAuth } from '../../lib/auth'
import { Card, CardBody } from '../../components/ui/Card'
import { StatusPill } from '../../components/ui/StatusPill'
import { EquipmentIcon } from '../../components/EquipmentIcon'
import { Select } from '../../components/ui/Input'

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
  const [error, setError] = useState<string | null>(null)
  const canEdit = user?.role === 'admin' || user?.role === 'staff'

  useEffect(() => {
    api.get('/equipment').then((res) => setFleet(res.data.data)).finally(() => setLoading(false))
  }, [])

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
    <div>
      <h1 className="text-2xl font-semibold text-ink-950">Fleet</h1>
      <p className="mt-1 text-ink-600">{fleet.length} units across the business.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-lagoon-50" />
          ))}
        </div>
      ) : (
        Object.entries(grouped).map(([type, items]) => (
          <div key={type} className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
              {TYPE_LABELS[type as EquipmentType]}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardBody className="pt-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-lagoon-50 text-lagoon-600">
                        <EquipmentIcon type={item.type} className="h-4.5 w-4.5" />
                      </div>
                      <StatusPill status={item.status} />
                    </div>
                    <p className="text-sm font-semibold text-ink-950">{item.name}</p>
                    <p className="text-xs text-ink-500">RM {item.hourly_rate}/hr</p>

                    {canEdit && (
                      <Select
                        className="mt-3 text-xs"
                        value={item.status}
                        disabled={savingId === item.id}
                        onChange={(e) => updateStatus(item, e.target.value as EquipmentStatus)}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </Select>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

import { useState } from 'react'
import { api, apiErrorMessage } from '../../lib/api'
import type { Booking } from '../../types'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'

export function CheckInStep({ booking, onUpdate }: { booking: Booking; onUpdate: (b: Booking) => void }) {
  const [briefingGiven, setBriefingGiven] = useState(false)
  const [gearIssued, setGearIssued] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post(`/bookings/${booking.id}/check-in`, {
        safety_briefing_given: briefingGiven,
        safety_gear_issued: gearIssued,
      })
      onUpdate(res.data.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-ink-950">Step 1 · Check-in & safety briefing</h3>
      </CardHeader>
      <CardBody className="space-y-3">
        <label className="flex items-center gap-2.5 rounded-xl border border-ink-200 px-3.5 py-3 text-sm">
          <input type="checkbox" className="h-4 w-4 rounded accent-lagoon-600" checked={briefingGiven} onChange={(e) => setBriefingGiven(e.target.checked)} />
          Safety briefing given
        </label>
        <label className="flex items-center gap-2.5 rounded-xl border border-ink-200 px-3.5 py-3 text-sm">
          <input type="checkbox" className="h-4 w-4 rounded accent-lagoon-600" checked={gearIssued} onChange={(e) => setGearIssued(e.target.checked)} />
          Safety gear issued (life jacket, etc.)
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button className="w-full" loading={loading} disabled={!briefingGiven || !gearIssued} onClick={submit}>
          Confirm check-in
        </Button>
      </CardBody>
    </Card>
  )
}

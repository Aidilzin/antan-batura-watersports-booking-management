import { useState } from 'react'
import { api, apiErrorMessage } from '../../lib/api'
import type { Booking } from '../../types'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'

export function HandoverStep({ booking, onUpdate }: { booking: Booking; onUpdate: (b: Booking) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post(`/bookings/${booking.id}/hand-over`)
      onUpdate(res.data.booking)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-ink-950">Hand over equipment</h3>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-sm text-ink-600">
          Payment confirmed. Hand the equipment to the customer to start the usage clock.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button className="w-full" loading={loading} onClick={submit}>
          Confirm handover — start usage clock
        </Button>
      </CardBody>
    </Card>
  )
}

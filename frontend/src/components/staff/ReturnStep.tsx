import { useState } from 'react'
import { api, apiErrorMessage } from '../../lib/api'
import type { Booking } from '../../types'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export function ReturnStep({ booking, onUpdate }: { booking: Booking; onUpdate: (b: Booking) => void }) {
  const [condition, setCondition] = useState<'good' | 'damaged'>('good')
  const [description, setDescription] = useState('')
  const [deposit, setDeposit] = useState('50.00')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post(`/bookings/${booking.id}/return`, {
        condition_on_return: condition,
        damage_description: condition === 'damaged' ? description : undefined,
        deposit_charged: condition === 'damaged' ? parseFloat(deposit) : undefined,
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
        <h3 className="font-semibold text-ink-950">Return & inspection</h3>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setCondition('good')}
            className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
              condition === 'good' ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-ink-200 text-ink-600'
            }`}
          >
            Good condition
          </button>
          <button
            onClick={() => setCondition('damaged')}
            className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
              condition === 'damaged' ? 'border-red-300 bg-red-50 text-red-700' : 'border-ink-200 text-ink-600'
            }`}
          >
            Damaged
          </button>
        </div>

        {condition === 'damaged' && (
          <div className="space-y-3 rounded-xl bg-red-50/60 p-4">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-ink-800">Damage description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm focus-ring"
                placeholder="e.g. Cracked hull near the bow, ~10cm"
              />
            </label>
            <Input label="Deposit to charge (RM)" type="number" step="0.01" min="0" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          className="w-full"
          loading={loading}
          disabled={
            condition === 'damaged' &&
            (!description.trim() || deposit.trim() === '' || isNaN(parseFloat(deposit)) || parseFloat(deposit) < 0)
          }
          onClick={submit}
        >
          Complete return
        </Button>
      </CardBody>
    </Card>
  )
}

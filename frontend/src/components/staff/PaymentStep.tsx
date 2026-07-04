import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, apiErrorMessage } from '../../lib/api'
import type { Booking, GatewayInstruction, Payment, PaymentMethod } from '../../types'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { CountUp } from '../ui/CountUp'

const METHODS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: 'qr', label: 'QR Pay', hint: 'DuitNow-style QR' },
  { value: 'bank_transfer', label: 'Bank Transfer', hint: 'Online banking' },
  { value: 'cash', label: 'Cash', hint: 'Paid on the spot' },
]

export function PaymentStep({
  booking,
  suggestedAmount,
  purpose = 'booking',
  onConfirmed,
}: {
  booking: Booking
  suggestedAmount: number
  purpose?: 'booking' | 'overtime' | 'damage'
  onConfirmed: (payment: Payment) => void | Promise<void>
}) {
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [checkout, setCheckout] = useState<{ payment: Payment; checkout: GatewayInstruction } | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startCheckout(selectedMethod: PaymentMethod) {
    setMethod(selectedMethod)
    setCheckout(null)
    setLoading(true)
    setError(null)
    try {
      const res = await api.post(`/bookings/${booking.id}/payments`, {
        method: selectedMethod,
        amount: suggestedAmount.toFixed(2),
        purpose,
      })
      setCheckout(res.data)
    } catch (err) {
      setError(apiErrorMessage(err))
      setMethod(null)
    } finally {
      setLoading(false)
    }
  }

  async function confirmReceived() {
    if (!checkout) return
    setConfirming(true)
    setError(null)
    try {
      const res = await api.post(`/payments/${checkout.payment.id}/confirm`)
      onConfirmed(res.data.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setConfirming(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h3 className="font-semibold text-ink-950">Payment</h3>
        <CountUp value={suggestedAmount} prefix="RM " decimals={2} className="text-lg font-semibold text-lagoon-700" />
      </CardHeader>
      <CardBody>
        {!checkout && (
          <div className="grid grid-cols-3 gap-3">
            {METHODS.map((m) => (
              <button
                key={m.value}
                disabled={loading}
                onClick={() => startCheckout(m.value)}
                className={`rounded-xl border px-3 py-4 text-center transition-colors ${
                  method === m.value ? 'border-lagoon-400 bg-lagoon-50' : 'border-ink-200 hover:border-lagoon-200 hover:bg-lagoon-50/40'
                }`}
              >
                <p className="text-sm font-medium text-ink-950">{m.label}</p>
                <p className="mt-0.5 text-xs text-ink-500">{m.hint}</p>
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {checkout && (
            <motion.div
              key={checkout.checkout.method}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {checkout.checkout.method === 'qr' && (
                <div className="flex flex-col items-center rounded-2xl bg-surface-sunken p-6">
                  <div className="rounded-xl bg-white p-3 shadow-soft">
                    <QRCodeSVG value={checkout.checkout.qr_payload ?? ''} size={160} />
                  </div>
                  <p className="mt-3 font-mono text-xs text-ink-500">{checkout.checkout.reference}</p>
                </div>
              )}

              {checkout.checkout.method === 'bank_transfer' && checkout.checkout.bank_account && (
                <div className="space-y-2 rounded-2xl bg-surface-sunken p-5">
                  <Row label="Bank" value={checkout.checkout.bank_account.bank_name} />
                  <Row label="Account name" value={checkout.checkout.bank_account.account_name} />
                  <Row label="Account number" value={checkout.checkout.bank_account.account_number} mono />
                  <Row label="Reference" value={checkout.checkout.reference} mono />
                </div>
              )}

              {checkout.checkout.method === 'cash' && (
                <div className="rounded-2xl bg-surface-sunken p-5 text-center">
                  <p className="text-sm text-ink-600">Collect RM {checkout.checkout.amount} in cash from the customer.</p>
                </div>
              )}

              <p className="text-center text-xs text-ink-500">{checkout.checkout.instructions}</p>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="w-1/3 text-xs"
                  onClick={() => { setCheckout(null); setMethod(null); setError(null); }}
                  disabled={confirming}
                >
                  Change method
                </Button>
                {checkout.checkout.requires_simulation ? (
                  <Button className="flex-1 text-xs sm:text-sm" loading={confirming} onClick={confirmReceived}>
                    Simulate payment received
                  </Button>
                ) : (
                  <Button className="flex-1 text-xs sm:text-sm" loading={confirming} onClick={confirmReceived}>
                    Mark cash received
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && !checkout && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </CardBody>
    </Card>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-500">{label}</span>
      <span className={`font-medium text-ink-950 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

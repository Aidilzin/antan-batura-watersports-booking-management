import type { Booking } from '../../types'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { StatusPill } from '../ui/StatusPill'

/** Digital receipt — shown once a booking is completed or cancelled. */
export function ReceiptSummary({ booking }: { booking: Booking }) {
  const confirmedPayments = booking.payments?.filter((p) => p.status === 'confirmed') ?? []
  const totalPaid = confirmedPayments.reduce((sum, p) => sum + Number(p.amount), 0)

  // Calculate base cost
  const [sh, sm] = booking.start_time.split(':').map(Number)
  const [eh, em] = booking.end_time.split(':').map(Number)
  const hours = (eh * 60 + em - (sh * 60 + sm)) / 60
  const rate = booking.equipment ? parseFloat(String(booking.equipment.hourly_rate)) : 0
  const baseCost = isNaN(rate) ? 0 : rate * hours

  // Extra charges
  const overtimeCost = booking.usage_log ? parseFloat(String(booking.usage_log.extra_charge_amount)) : 0
  const damageCost = booking.damage_reports && booking.damage_reports.length > 0
    ? parseFloat(String(booking.damage_reports[0].deposit_charged))
    : 0

  const totalCost = baseCost + overtimeCost + damageCost
  const outstandingBalance = Math.max(0, totalCost - totalPaid)

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h3 className="font-semibold text-ink-950">Receipt</h3>
        <StatusPill status={booking.status} />
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="rounded-xl bg-surface-sunken p-4 text-xs space-y-2 border border-ink-150">
          <div className="flex justify-between py-0.5">
            <span className="text-ink-500">Booking Reference</span>
            <span className="font-mono font-semibold text-ink-950">{booking.booking_reference}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-ink-500">Equipment</span>
            <span className="font-medium text-ink-950">{booking.equipment?.name}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-ink-500">Scheduled Slot</span>
            <span className="font-medium text-ink-950">{booking.booking_date}, {booking.start_time}–{booking.end_time}</span>
          </div>

          <div className="border-t border-dashed border-ink-200/60 my-2 pt-2 space-y-1.5">
            <div className="flex justify-between py-0.5">
              <span className="text-ink-500">Base Rental ({hours} hr @ RM {rate.toFixed(2)}/hr)</span>
              <span className="font-medium text-ink-950">RM {baseCost.toFixed(2)}</span>
            </div>
            {overtimeCost > 0 && (
              <div className="flex justify-between py-0.5">
                <span className="text-amber-700">Overtime Fee ({booking.usage_log?.exceeded_minutes} min)</span>
                <span className="font-semibold text-amber-700">RM {overtimeCost.toFixed(2)}</span>
              </div>
            )}
            {damageCost > 0 && (
              <div className="flex justify-between py-0.5">
                <span className="text-red-700">Damage Deposit</span>
                <span className="font-semibold text-red-700">RM {damageCost.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-ink-200/80 pt-2 flex justify-between font-semibold text-sm">
            <span className="text-ink-900">Total Invoice Cost</span>
            <span className="text-ink-950">RM {totalCost.toFixed(2)}</span>
          </div>
        </div>

        {/* Confirmed Transactions */}
        {confirmedPayments.length > 0 && (
          <div className="space-y-1.5 bg-emerald-50/20 border border-emerald-100 rounded-xl p-3">
            <h4 className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">Confirmed Payments</h4>
            {confirmedPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs text-ink-600">
                <span className="font-mono text-[10px]">{p.mock_transaction_id}</span>
                <span>{p.method.toUpperCase()} · <span className="font-semibold text-emerald-700">RM {parseFloat(p.amount).toFixed(2)}</span></span>
              </div>
            ))}
          </div>
        )}

        {/* Invoice Summary */}
        <div className="border-t border-ink-150 pt-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink-500">Total Amount Paid</span>
            <span className="font-bold text-ink-900">RM {totalPaid.toFixed(2)}</span>
          </div>
          {outstandingBalance > 0 ? (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-2 font-semibold">
              <span className="text-amber-800">Outstanding Balance (Unpaid)</span>
              <span className="text-lg text-amber-800">RM {outstandingBalance.toFixed(2)}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2 font-semibold">
              <span className="text-emerald-800">Outstanding Balance</span>
              <span className="text-emerald-800">Fully Settled</span>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

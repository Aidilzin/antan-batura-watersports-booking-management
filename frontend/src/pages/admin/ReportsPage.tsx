import { useEffect, useState, useMemo } from 'react'
import { api, apiErrorMessage } from '../../lib/api'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { CountUp } from '../../components/ui/CountUp'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts'

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

const RANGE_PRESETS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

const METHOD_COLORS: Record<string, string> = {
  qr: '#0e7490',
  bank_transfer: '#1baf7a',
  cash: '#eda100',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  in_use: 'In Use',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

interface SalesReport {
  total_revenue: number
  by_day: { date: string; total: string }[]
  by_method: { method: string; total: string; count: number }[]
}

interface BookingsReport {
  total_bookings: number
  waitlisted: number
  by_status: { status: string; count: number }[]
  by_channel: { channel: string; count: number }[]
}

interface EquipmentUsageRow {
  equipment_id: number
  equipment_name: string
  bookings_count: number
  total_exceeded_minutes: number
  total_overtime_revenue: number
  damage_count: number
  total_deposits: number
}

interface FinancialReport {
  range: { from: string; to: string }
  total_revenue: number
  transaction_count: number
  avg_transaction: number
  by_method: { method: string; total: string; count: number }[]
  by_equipment_type: { equipment_type: string; revenue: string }[]
  total_overtime: number
  total_damage_deposits: number
  cancellation_counts: { cancellation_type: string; count: number }[]
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'utilization' | 'financial'>('utilization')
  const [days, setDays] = useState(30)
  
  // Custom range for financial report
  const [fromDate, setFromDate] = useState(isoDaysAgo(30))
  const [toDate, setToDate] = useState(isoDaysAgo(0))

  // Utilization state
  const [sales, setSales] = useState<SalesReport | null>(null)
  const [bookings, setBookings] = useState<BookingsReport | null>(null)
  const [usage, setUsage] = useState<EquipmentUsageRow[]>([])
  const [loadingUtilization, setLoadingUtilization] = useState(true)

  // Financial state
  const [financial, setFinancial] = useState<FinancialReport | null>(null)
  const [loadingFinancial, setLoadingFinancial] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [financialError, setFinancialError] = useState<string | null>(null)

  // Fetch Utilization data when days/tab changes
  useEffect(() => {
    if (activeTab !== 'utilization') return
    const from = isoDaysAgo(days)
    const to = isoDaysAgo(0)
    setLoadingUtilization(true)
    Promise.all([
      api.get('/reports/sales', { params: { from, to } }),
      api.get('/reports/bookings', { params: { from, to } }),
      api.get('/reports/equipment-usage', { params: { from, to } }),
    ])
      .then(([s, b, u]) => {
        setSales(s.data)
        setBookings(b.data)
        setUsage(u.data.equipment)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingUtilization(false))
  }, [days, activeTab])

  // Fetch Financial data
  async function fetchFinancialReport() {
    setLoadingFinancial(true)
    setFinancialError(null)
    try {
      const res = await api.get('/reports/financial', {
        params: { from: fromDate, to: toDate },
      })
      setFinancial(res.data)
    } catch (err) {
      setFinancialError(apiErrorMessage(err))
      setFinancial(null)
    } finally {
      setLoadingFinancial(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'financial') {
      fetchFinancialReport()
    }
  }, [fromDate, toDate, activeTab])

  // Export Financial CSV
  async function handleExportCsv() {
    setExportingCsv(true)
    try {
      const res = await api.get('/reports/financial', {
        params: { from: fromDate, to: toDate, export: 'csv' },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `financial_report_${fromDate}_to_${toDate}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('Failed to export CSV: ' + apiErrorMessage(err))
    } finally {
      setExportingCsv(false)
    }
  }

  // Group utilization data
  const usageByType = useMemo(() => {
    const groups: Record<string, number> = {}
    usage.forEach((row) => {
      let groupName = 'Other'
      if (row.equipment_name.includes('Cruise')) groupName = 'Cruise Boat'
      else if (row.equipment_name.includes('Single Kayak')) groupName = 'Single Kayak'
      else if (row.equipment_name.includes('Kayak #') || row.equipment_name.includes('Double')) groupName = 'Double Kayak'
      else if (row.equipment_name.includes('Canoe')) groupName = 'Canoe'
      else if (row.equipment_name.includes('Family')) groupName = 'Family Paddle Boat'
      else if (row.equipment_name.includes('Paddle')) groupName = 'Paddle Boat'

      groups[groupName] = (groups[groupName] || 0) + row.bookings_count
    })
    return Object.entries(groups)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [usage])

  const sortedAllEquipment = useMemo(() => {
    return [...usage].sort((a, b) => b.bookings_count - a.bookings_count)
  }, [usage])

  return (
    <div className="space-y-6">
      {/* Title & Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-100 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-950">Analytics & Reports</h1>
          <p className="mt-1 text-xs text-ink-600">Track company sales, bookings, equipment utilization, and cancellations.</p>
        </div>

        <div className="flex gap-1.5 rounded-xl bg-lagoon-50 p-1">
          <button
            onClick={() => setActiveTab('utilization')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'utilization' ? 'bg-white text-lagoon-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            Fleet Utilization
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'financial' ? 'bg-white text-lagoon-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            Financial & Cancellations
          </button>
        </div>
      </div>

      {/* Utilization tab view */}
      {activeTab === 'utilization' && (
        <>
          <div className="flex justify-end mb-2">
            <div className="flex gap-1 rounded-xl bg-lagoon-50 p-1">
              {RANGE_PRESETS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => setDays(p.days)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    days === p.days ? 'bg-white text-lagoon-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {loadingUtilization ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-lagoon-50" />)}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatTile label="Total revenue" value={sales?.total_revenue ?? 0} prefix="RM " decimals={2} />
                <StatTile label="Total bookings" value={bookings?.total_bookings ?? 0} />
                <StatTile label="Waitlisted Bookings" value={bookings?.waitlisted ?? 0} tone="amber" />
              </div>

              <Card>
                <CardHeader><h3 className="font-semibold text-ink-950 text-sm">Revenue over time</h3></CardHeader>
                <CardBody className="pt-2">
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={sales?.by_day ?? []} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0e7490" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#0e7490" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e1e0d9" strokeDasharray="0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#898781' }} tickLine={false} axisLine={{ stroke: '#c3c2b7' }} minTickGap={24} />
                      <YAxis tick={{ fontSize: 11, fill: '#898781' }} tickLine={false} axisLine={false} width={48} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid #e1e0d9', fontSize: 13 }}
                        formatter={(value: any) => [`RM ${Number(value).toFixed(2)}`, 'Revenue']}
                      />
                      <Area type="monotone" dataKey="total" stroke="#0e7490" strokeWidth={2} fill="url(#revenueFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader><h3 className="font-semibold text-ink-950 text-sm">Revenue by payment method</h3></CardHeader>
                  <CardBody className="pt-2">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={sales?.by_method ?? []} layout="vertical" margin={{ left: 8, right: 24 }}>
                        <CartesianGrid stroke="#e1e0d9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#898781' }} tickLine={false} axisLine={false} />
                        <YAxis
                          type="category"
                          dataKey="method"
                          tick={{ fontSize: 12, fill: '#52514e' }}
                          tickLine={false}
                          axisLine={false}
                          width={95}
                          tickFormatter={(v) => v.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: '1px solid #e1e0d9', fontSize: 13 }}
                          formatter={(value: any) => [`RM ${Number(value).toFixed(2)}`, 'Revenue']}
                        />
                        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                          {(sales?.by_method ?? []).map((entry) => (
                            <Cell key={entry.method} fill={METHOD_COLORS[entry.method] ?? '#7c8798'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader><h3 className="font-semibold text-ink-950 text-sm">Bookings by status</h3></CardHeader>
                  <CardBody className="pt-2">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={bookings?.by_status ?? []} margin={{ left: 0, right: 8 }}>
                        <CartesianGrid stroke="#e1e0d9" vertical={false} />
                        <XAxis 
                          dataKey="status" 
                          tick={{ fontSize: 11, fill: '#898781' }} 
                          tickLine={false} 
                          axisLine={{ stroke: '#c3c2b7' }} 
                          tickFormatter={(v) => STATUS_LABELS[v] || v}
                        />
                        <YAxis tick={{ fontSize: 11, fill: '#898781' }} tickLine={false} axisLine={false} width={32} />
                        <Tooltip 
                          contentStyle={{ borderRadius: 12, border: '1px solid #e1e0d9', fontSize: 13 }}
                          formatter={(value: any) => [value, 'Bookings']}
                          labelFormatter={(label) => STATUS_LABELS[label] || label}
                        />
                        <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardBody>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-ink-950 text-sm">Utilization by Watercraft Category</h3>
                  </CardHeader>
                  <CardBody className="pt-2">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={usageByType} layout="vertical" margin={{ left: 8, right: 24 }}>
                        <CartesianGrid stroke="#e1e0d9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#898781' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#52514e' }} tickLine={false} axisLine={false} width={120} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e1e0d9', fontSize: 13 }} />
                        <Bar dataKey="count" name="Total Bookings" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-ink-950 text-sm">Utilization by Individual Rental Unit</h3>
                  </CardHeader>
                  <CardBody className="pt-2">
                    <div className="w-full h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                      <ResponsiveContainer width="100%" height={Math.max(260, sortedAllEquipment.length * 32)}>
                        <BarChart data={sortedAllEquipment} layout="vertical" margin={{ left: 8, right: 24 }}>
                          <CartesianGrid stroke="#e1e0d9" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#898781' }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <YAxis type="category" dataKey="equipment_name" tick={{ fontSize: 11, fill: '#52514e' }} tickLine={false} axisLine={false} width={130} />
                          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e1e0d9', fontSize: 13 }} />
                          <Bar dataKey="bookings_count" name="Bookings count" fill="#0e7490" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardBody>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {/* Financial tab view */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          {/* Custom Date Picker controls & CSV download */}
          <div className="flex flex-wrap items-end justify-between gap-4 bg-lagoon-50/20 border border-lagoon-100 rounded-3xl p-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-44">
                <Input
                  label="From Date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="w-44">
                <Input
                  label="To Date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <Button onClick={fetchFinancialReport} loading={loadingFinancial} className="mb-0.5">
                Apply Range
              </Button>
            </div>

            <Button
              variant="secondary"
              loading={exportingCsv}
              onClick={handleExportCsv}
              disabled={!financial}
              className="mb-0.5"
            >
              📥 Export CSV Report
            </Button>
          </div>

          {financialError && (
            <div className="rounded-xl bg-red-50 p-4 text-xs font-semibold text-red-750">
              {financialError}
            </div>
          )}

          {loadingFinancial ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-lagoon-50" />
              ))}
            </div>
          ) : financial ? (
            <div className="space-y-6">
              {/* Financial Metrics Row */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile label="Gross revenue" value={financial.total_revenue} prefix="RM " decimals={2} />
                <StatTile label="Avg Transaction" value={financial.avg_transaction} prefix="RM " decimals={2} />
                <StatTile label="Overtime Revenue" value={financial.total_overtime} prefix="RM " decimals={2} tone="amber" />
                <StatTile label="Damage Charges" value={financial.total_damage_deposits} prefix="RM " decimals={2} tone="amber" />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Revenue by Watercraft Category */}
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-ink-950 text-sm">Revenue by Watercraft Type</h3>
                  </CardHeader>
                  <CardBody className="pt-2">
                    {financial.by_equipment_type.length === 0 ? (
                      <p className="text-xs text-ink-500 py-4">No segment revenue found for this range.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-ink-150 text-ink-500 font-semibold">
                              <th className="py-2.5">Category Type</th>
                              <th className="py-2.5 text-right">Revenue (RM)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {financial.by_equipment_type.map((row) => (
                              <tr key={row.equipment_type} className="border-b border-ink-100 hover:bg-surface-sunken">
                                <td className="py-3 font-medium text-ink-900 capitalize">
                                  {row.equipment_type.replace('_', ' ')}
                                </td>
                                <td className="py-3 font-semibold text-ink-950 text-right">
                                  RM {parseFloat(row.revenue).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* Cancellations & Transactions summary */}
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-ink-950 text-sm">Cancellations Breakdown</h3>
                  </CardHeader>
                  <CardBody className="pt-2 space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-ink-150 text-ink-500 font-semibold">
                            <th className="py-2.5">Cancellation Type</th>
                            <th className="py-2.5 text-right">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['self_service', 'staff_override', 'no_show'].map((type) => {
                            const found = financial.cancellation_counts.find(c => c.cancellation_type === type)
                            const count = found ? found.count : 0
                            const label = type === 'self_service' ? 'Self-service (Customer)' : type === 'staff_override' ? 'Staff Override' : 'No-Show'
                            return (
                              <tr key={type} className="border-b border-ink-100 hover:bg-surface-sunken">
                                <td className="py-3 font-medium text-ink-900">{label}</td>
                                <td className="py-3 font-bold text-ink-950 text-right">{count}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Transactions by Method list */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-ink-950 text-sm">Transactions & Payments Breakdown</h3>
                </CardHeader>
                <CardBody className="pt-2">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {financial.by_method.map((row) => (
                      <div key={row.method} className="border border-ink-150 rounded-2xl p-4 bg-surface-sunken/40">
                        <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wide">
                          {row.method === 'qr' ? 'DuitNow QR' : row.method.replace('_', ' ')}
                        </span>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="text-lg font-bold text-lagoon-700">RM {parseFloat(String(row.total)).toFixed(2)}</span>
                          <span className="text-xxs text-ink-500 font-semibold">{row.count} tx</span>
                        </div>
                      </div>
                    ))}
                    {financial.by_method.length === 0 && (
                      <p className="text-xs text-ink-500 col-span-3 py-2 text-center">No payment transactions recorded in this range.</p>
                    )}
                  </div>
                </CardBody>
              </Card>
            </div>
          ) : (
            <p className="text-xs text-ink-500 py-8 text-center border border-dashed border-ink-200 rounded-3xl">
              No financial data available for this range. Select dates and click "Apply Range" to generate.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function StatTile({ label, value, prefix, decimals = 0, tone = 'lagoon' }: {
  label: string
  value: number
  prefix?: string
  decimals?: number
  tone?: 'lagoon' | 'amber'
}) {
  return (
    <Card>
      <CardBody className="pt-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{label}</p>
        <CountUp
          value={value}
          prefix={prefix}
          decimals={decimals}
          className={`mt-1 block text-2xl font-bold tracking-tight ${tone === 'amber' ? 'text-amber-600' : 'text-lagoon-700'}`}
        />
      </CardBody>
    </Card>
  )
}

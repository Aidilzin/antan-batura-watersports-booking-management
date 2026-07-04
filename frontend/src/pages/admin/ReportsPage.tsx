import { useEffect, useState, useMemo } from 'react'
import { api } from '../../lib/api'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { CountUp } from '../../components/ui/CountUp'
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

// Categorical order for payment methods
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

export function ReportsPage() {
  const [days, setDays] = useState(30)
  const [sales, setSales] = useState<SalesReport | null>(null)
  const [bookings, setBookings] = useState<BookingsReport | null>(null)
  const [usage, setUsage] = useState<EquipmentUsageRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const from = isoDaysAgo(days)
    const to = isoDaysAgo(0)
    setLoading(true)
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
      .finally(() => setLoading(false))
  }, [days])

  // Group utilization data by Category Type (Single Kayak, Double Kayak, Canoe, Cruise Boat, Paddle Boat, etc.)
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

  // All active rental units (sorted by utilization volume, showing all 21 units)
  const sortedAllEquipment = useMemo(() => {
    return [...usage].sort((a, b) => b.bookings_count - a.bookings_count)
  }, [usage])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-950">Analytics & Reports</h1>
          <p className="mt-1 text-ink-600">Track company sales, booking volumes, and equipment category utilization.</p>
        </div>
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

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-lagoon-50" />)}
        </div>
      ) : (
        <>
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
            {/* Grouped Category Utilization */}
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

            {/* Individual Rental Units (All 21 units listed sorted) */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-ink-950 text-sm">Utilization by Individual Rental Unit (All Units)</h3>
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
        </>
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
        <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
        <CountUp
          value={value}
          prefix={prefix}
          decimals={decimals}
          className={`mt-1 block text-2xl font-semibold ${tone === 'amber' ? 'text-amber-600' : 'text-lagoon-700'}`}
        />
      </CardBody>
    </Card>
  )
}

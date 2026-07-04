import { useEffect, useState } from 'react'
import type { Booking } from '../../types'
import { Card, CardBody, CardHeader } from '../ui/Card'

function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function UsageTimer({ booking }: { booking: Booking }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setNow(new Date())
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [booking.id, booking.handed_over_at])

  const startedAt = booking.handed_over_at ? new Date(booking.handed_over_at) : null
  const bookedMinutes = toMinutes(booking.end_time) - toMinutes(booking.start_time)
  const elapsedMs = startedAt ? now.getTime() - startedAt.getTime() : 0
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000))
  const elapsedSeconds = Math.max(0, Math.floor((elapsedMs / 1000) % 60))
  const progress = bookedMinutes > 0 ? Math.min(1, elapsedMinutes / bookedMinutes) : 0
  const isOvertime = elapsedMinutes > bookedMinutes

  const circumference = 2 * Math.PI * 44
  const offset = circumference * (1 - progress)

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-ink-950">Usage in progress</h3>
      </CardHeader>
      <CardBody className="flex items-center gap-6">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#eef7f9" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={isOvertime ? '#d97706' : '#0e7490'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="tabular text-lg font-semibold text-ink-950">
              {elapsedMinutes}:{elapsedSeconds.toString().padStart(2, '0')}
            </span>
            <span className="text-[10px] text-ink-400">of {bookedMinutes} min</span>
          </div>
        </div>
        <div>
          <p className="text-sm text-ink-600">
            Booked window: <span className="font-medium text-ink-950">{booking.start_time}–{booking.end_time}</span>
          </p>
          {isOvertime ? (
            <p className="mt-1 text-sm font-medium text-amber-700">
              {elapsedMinutes - bookedMinutes} min over — an overtime charge will apply at return.
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-500">On time. Return to close out the booking.</p>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

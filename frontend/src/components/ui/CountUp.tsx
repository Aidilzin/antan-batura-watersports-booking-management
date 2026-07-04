import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

/** Animates a number counting up on mount/change — used for money and stat figures. */
export function CountUp({ value, prefix = '', decimals = 0, className = '' }: {
  value: number
  prefix?: string
  decimals?: number
  className?: string
}) {
  const [display, setDisplay] = useState(0)
  const prefersReducedMotion = useReducedMotion()
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplay(value)
      return
    }

    const start = performance.now()
    const from = display
    const duration = 600

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (value - from) * eased)
      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, prefersReducedMotion])

  return (
    <span className={`tabular ${className}`}>
      {prefix}
      {display.toLocaleString('en-MY', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  )
}

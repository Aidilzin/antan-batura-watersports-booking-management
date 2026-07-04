import type { EquipmentType } from '../types'

/** Simple line icons per equipment type — keeps the fleet grid scannable at a glance. */
export function EquipmentIcon({ type, className = 'h-6 w-6' }: { type: EquipmentType; className?: string }) {
  const common = { className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  switch (type) {
    case 'cruise_boat':
      return (
        <svg {...common}>
          <path d="M3 16h18l-2 4H5l-2-4Z" />
          <path d="M6 16V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8" />
          <path d="M9 6V3M15 6V3" />
        </svg>
      )
    case 'kayak_single':
    case 'kayak_double':
      return (
        <svg {...common}>
          <path d="M2 14c4-3 16-3 20 0-4 3-16 3-20 0Z" />
          <path d="M12 6v3M8 4l2 2M16 4l-2 2" />
        </svg>
      )
    case 'canoe':
      return (
        <svg {...common}>
          <path d="M2 13c4 4 16 4 20 0-4-6-16-6-20 0Z" />
        </svg>
      )
    case 'paddle_boat':
    case 'paddle_boat_family':
      return (
        <svg {...common}>
          <circle cx="12" cy="13" r="4" />
          <path d="M2 13h4M18 13h4M12 5v4M12 17v2" />
        </svg>
      )
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>
  }
}

import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface NavLink {
  label: string
  onClick: () => void
  active?: boolean
}

interface PublicNavbarProps {
  navLinks?: NavLink[]
  /** Override right-side CTA; defaults to a "Book Now" button */
  cta?: ReactNode
  /** Whether to use absolute (overlay) or sticky positioning */
  position?: 'absolute' | 'sticky'
  /** Navbar theme: 'light' or 'dark' */
  theme?: 'light' | 'dark'
}

export function PublicNavbar({ navLinks, cta, position = 'absolute', theme = 'dark' }: PublicNavbarProps) {
  const navigate = useNavigate()

  const posClass = position === 'sticky'
    ? 'sticky top-0 z-50'
    : 'absolute top-0 inset-x-0 z-50'

  const isDark = theme === 'dark'

  const navClass = isDark
    ? 'backdrop-blur-md bg-black/25 border-b border-white/10'
    : 'backdrop-blur-md bg-white/70 border-b border-ink-150/50'

  const textClass = isDark ? 'text-white' : 'text-ink-950'

  return (
    <nav className={`${posClass} flex items-center justify-between px-5 sm:px-8 py-3 transition-colors duration-300 ${navClass}`}>
      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2.5 focus:outline-none group"
      >
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-lagoon-500 text-white shadow group-hover:bg-lagoon-600 transition-colors">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2 20h20v2H2v-2zm2-4l5-8 4 6 3-4 6 6H4z" />
          </svg>
        </div>
        <span className={`text-sm font-extrabold tracking-tight transition-colors ${textClass}`}>
          Antan Batura
        </span>
      </button>

      {/* Centre nav links */}
      {navLinks && navLinks.length > 0 && (
        <div className="hidden sm:flex items-center gap-1">
          {navLinks.map((link) => {
            const buttonClass = isDark
              ? link.active
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
              : link.active
                ? 'bg-lagoon-50 text-lagoon-700 border border-lagoon-100 shadow-soft'
                : 'text-ink-600 hover:text-lagoon-600 hover:bg-lagoon-50/60 border border-transparent'

            return (
              <button
                key={link.label}
                onClick={link.onClick}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${buttonClass}`}
              >
                {link.label}
              </button>
            )
          })}
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center gap-2">
        {cta ?? (
          <button
            onClick={() => navigate('/book')}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-lagoon-500 text-white hover:bg-lagoon-600 transition-all shadow-sm"
          >
            Book Now
          </button>
        )}
      </div>
    </nav>
  )
}


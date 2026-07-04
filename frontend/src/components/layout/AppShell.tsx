import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../lib/auth'
import clsx from 'clsx'

const NAV_BY_ROLE = {
  customer: [
    { to: '/book', label: 'Book equipment' },
    { to: '/bookings', label: 'My bookings' },
  ],
  staff: [
    { to: '/desk', label: 'Front desk' },
    { to: '/all-bookings', label: 'All bookings' },
    { to: '/fleet', label: 'Fleet' },
  ],
  admin: [
    { to: '/desk', label: 'Front desk' },
    { to: '/all-bookings', label: 'All bookings' },
    { to: '/fleet', label: 'Fleet' },
    { to: '/reports', label: 'Reports' },
    { to: '/staff', label: 'Staff' },
  ],
} as const

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const links = user ? NAV_BY_ROLE[user.role] : [
    { to: '/', label: 'Home' },
    { to: '/book', label: 'Book now' },
  ]

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-base font-sans text-ink-900 antialiased">
      <header className="border-b border-ink-150 bg-white/70 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="flex items-center gap-2 font-bold text-lagoon-700">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-lagoon-500 text-white shadow-soft">
                <WaveIcon />
              </div>
              <div className="leading-tight">
                <span className="block text-sm tracking-tight text-ink-950 font-bold">Antan Batura</span>
                <span className="block text-[10px] text-ink-500 font-medium">Tasik Shah Alam</span>
              </div>
            </NavLink>

            {/* desktop nav */}
            <nav className="hidden md:flex gap-1.5">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    clsx(
                      'rounded-lg px-3.5 py-2 text-xs font-semibold tracking-wide uppercase transition-all',
                      isActive
                        ? 'bg-lagoon-50 text-lagoon-700 border border-lagoon-100 shadow-soft'
                        : 'text-ink-600 hover:text-lagoon-600 hover:bg-surface-sunken border border-transparent',
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <>
                <div className="hidden sm:block text-right leading-tight">
                  <p className="text-sm font-medium text-ink-950">{user.name}</p>
                  <p className="text-[11px] uppercase tracking-wide text-lagoon-600">{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="focus-ring rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  Log out
                </button>
              </>
            )}
          </div>
        </div>

        {/* mobile nav */}
        <div className="md:hidden flex gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                clsx(
                  'whitespace-nowrap flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-lagoon-50 text-lagoon-700' : 'text-ink-600',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </header>

      <motion.main
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className={clsx(
          "flex-1 w-full",
          location.pathname !== '/' && "mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8"
        )}
      >
        <Outlet />
      </motion.main>

      <footer className="mt-auto border-t border-ink-150 bg-white/60 backdrop-blur-md py-6 text-center text-xs text-ink-500">
        <div className="mx-auto w-full max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Antan Batura Watersports Tasik Shah Alam. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <NavLink to="/" className="hover:text-lagoon-600 transition-colors">Home</NavLink>
            <NavLink to="/book" className="hover:text-lagoon-600 transition-colors">Book Adventure</NavLink>
          </div>
        </div>
      </footer>
    </div>
  )
}

function WaveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M2 15c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M2 19c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  )
}

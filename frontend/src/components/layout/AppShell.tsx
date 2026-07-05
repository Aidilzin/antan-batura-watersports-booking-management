import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import clsx from 'clsx'

function LiveClock() {
  const [time, setTime] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col items-end text-xxs font-semibold text-ink-500 font-mono bg-lagoon-50/60 border border-lagoon-100/50 rounded-xl px-3 py-1 shadow-sm leading-tight">
      <span className="text-lagoon-700 font-bold">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
      <span className="text-[9px] text-ink-400 font-medium">
        {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
      </span>
    </div>
  )
}

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isPublicPage = location.pathname === '/' || location.pathname === '/book'
  const isLandingPage = location.pathname === '/'

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)

  // Listen to activeCard changes from landing page to highlight current nav item
  useEffect(() => {
    if (!isLandingPage) return
    const handleSlideChange = (e: Event) => {
      const customEvent = e as CustomEvent
      const idx = customEvent.detail?.slide
      if (typeof idx === 'number') {
        setActiveSlide(idx)
      }
    }
    window.addEventListener('change-slide', handleSlideChange)
    return () => window.removeEventListener('change-slide', handleSlideChange)
  }, [isLandingPage])

  // Auto-logout staff or admin if they land back on the home page
  useEffect(() => {
    if (isLandingPage && user && (user.role === 'admin' || user.role === 'staff')) {
      logout()
    }
  }, [isLandingPage, user, logout])

  // Landing page scrolling trigger
  function handleLandingNav(slideIdx: number) {
    setActiveSlide(slideIdx)
    setMobileMenuOpen(false)
    window.dispatchEvent(new CustomEvent('change-slide', { detail: { slide: slideIdx } }))
  }

  const links = (user && !isLandingPage)
    ? user.role === 'customer'
      ? [
          { to: '/book', label: 'Book Adventure' },
        ]
      : [
          { to: '/desk', label: 'Front desk' },
          { to: '/bookings', label: 'All bookings' },
          { to: '/fleet', label: 'Fleet' },
          user.role === 'admin' ? { to: '/reports', label: 'Reports' } : null,
          user.role === 'admin' ? { to: '/staff', label: 'Staff' } : null,
        ].filter(Boolean) as { to: string; label: string }[]
    : [
        { to: '/book', label: 'Book Adventure' },
      ]

  async function handleLogout() {
    await logout()
    setMobileMenuOpen(false)
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-base font-sans text-ink-900 antialiased relative">
      {!isPublicPage && (
        <header className={clsx(
          "z-40 transition-all duration-300 border-b border-ink-150/60 sticky top-0 bg-white/95 backdrop-blur-md shadow-sm"
        )}>
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

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1.5">
              {isLandingPage ? (
                <>
                  <button
                    onClick={() => handleLandingNav(0)}
                    className={clsx(
                      'rounded-lg px-3.5 py-2 text-xs font-semibold tracking-wide uppercase transition-all border border-transparent',
                      activeSlide === 0 ? 'bg-lagoon-50 text-lagoon-700 border-lagoon-100 shadow-soft' : 'text-ink-600 hover:text-lagoon-600 hover:bg-surface-sunken'
                    )}
                  >
                    Home
                  </button>
                  <button
                    onClick={() => handleLandingNav(1)}
                    className={clsx(
                      'rounded-lg px-3.5 py-2 text-xs font-semibold tracking-wide uppercase transition-all border border-transparent',
                      activeSlide === 1 ? 'bg-lagoon-50 text-lagoon-700 border-lagoon-100 shadow-soft' : 'text-ink-600 hover:text-lagoon-600 hover:bg-surface-sunken'
                    )}
                  >
                    Watercraft
                  </button>
                  <button
                    onClick={() => handleLandingNav(2)}
                    className={clsx(
                      'rounded-lg px-3.5 py-2 text-xs font-semibold tracking-wide uppercase transition-all border border-transparent',
                      activeSlide === 2 ? 'bg-lagoon-50 text-lagoon-700 border-lagoon-100 shadow-soft' : 'text-ink-600 hover:text-lagoon-600 hover:bg-surface-sunken'
                    )}
                  >
                    About Us
                  </button>
                  <button
                    onClick={() => handleLandingNav(3)}
                    className={clsx(
                      'rounded-lg px-3.5 py-2 text-xs font-semibold tracking-wide uppercase transition-all border border-transparent',
                      activeSlide === 3 ? 'bg-lagoon-50 text-lagoon-700 border-lagoon-100 shadow-soft' : 'text-ink-600 hover:text-lagoon-600 hover:bg-surface-sunken'
                    )}
                  >
                    Social Feed
                  </button>
                </>
              ) : (
                links.map((link) => (
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
                ))
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user && (user.role === 'staff' || user.role === 'admin') && (
              <div className="hidden sm:block">
                <LiveClock />
              </div>
            )}

            {/* Desktop Auth Controls */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <NavLink
                    to="/redirect"
                    className="focus-ring rounded-xl bg-lagoon-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-soft hover:bg-lagoon-655 transition-all"
                  >
                    Dashboard
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="focus-ring rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    to="/book"
                    className="focus-ring rounded-xl bg-lagoon-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-soft hover:bg-lagoon-655 transition-all"
                  >
                    Book Now
                  </NavLink>
                  <NavLink
                    to="/login"
                    className="focus-ring rounded-lg px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-ink-600 hover:bg-surface-sunken transition-colors"
                  >
                    Login
                  </NavLink>
                </>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl hover:bg-surface-sunken text-ink-650 focus:outline-none"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 border-b border-ink-150 bg-white/95 backdrop-blur-md px-4 py-4 space-y-3 shadow-lg z-50 animate-fadeIn">
            {isLandingPage ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleLandingNav(0)}
                  className={clsx(
                    'w-full text-left rounded-xl px-4 py-2.5 text-sm font-semibold uppercase tracking-wide transition-all border',
                    activeSlide === 0 ? 'bg-lagoon-50 text-lagoon-700 border-lagoon-100' : 'border-transparent text-ink-650 hover:bg-surface-sunken'
                  )}
                >
                  Home
                </button>
                <button
                  onClick={() => handleLandingNav(1)}
                  className={clsx(
                    'w-full text-left rounded-xl px-4 py-2.5 text-sm font-semibold uppercase tracking-wide transition-all border',
                    activeSlide === 1 ? 'bg-lagoon-50 text-lagoon-700 border-lagoon-100' : 'border-transparent text-ink-650 hover:bg-surface-sunken'
                  )}
                >
                  Watercraft
                </button>
                <button
                  onClick={() => handleLandingNav(2)}
                  className={clsx(
                    'w-full text-left rounded-xl px-4 py-2.5 text-sm font-semibold uppercase tracking-wide transition-all border',
                    activeSlide === 2 ? 'bg-lagoon-50 text-lagoon-700 border-lagoon-100' : 'border-transparent text-ink-650 hover:bg-surface-sunken'
                  )}
                >
                  About Us
                </button>
                <button
                  onClick={() => handleLandingNav(3)}
                  className={clsx(
                    'w-full text-left rounded-xl px-4 py-2.5 text-sm font-semibold uppercase tracking-wide transition-all border',
                    activeSlide === 3 ? 'bg-lagoon-50 text-lagoon-700 border-lagoon-100' : 'border-transparent text-ink-650 hover:bg-surface-sunken'
                  )}
                >
                  Social Feed
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        'w-full text-left rounded-xl px-4 py-2.5 text-sm font-semibold uppercase tracking-wide transition-all border',
                        isActive
                          ? 'bg-lagoon-50 text-lagoon-700 border-lagoon-100'
                          : 'border-transparent text-ink-650 hover:bg-surface-sunken',
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            )}

            <div className="border-t border-ink-150 pt-3 flex flex-col gap-2">
              {user ? (
                <>
                  <NavLink
                    to="/redirect"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center rounded-xl bg-lagoon-500 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-soft"
                  >
                    Dashboard
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="w-full text-center rounded-xl border border-ink-200 py-2.5 text-sm font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    to="/book"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center rounded-xl bg-lagoon-500 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-soft"
                  >
                    Book Now
                  </NavLink>
                  <NavLink
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center rounded-xl border border-ink-200 py-2.5 text-sm font-semibold uppercase tracking-wider text-ink-650 hover:bg-surface-sunken"
                  >
                    Login
                  </NavLink>
                </>
              )}
            </div>
          </div>
        )}
      </header>
      )}

      <main
        className={clsx(
          "flex-1 w-full",
          !isPublicPage && "mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8"
        )}
      >
        <Outlet />
      </main>

      {!isPublicPage && (
        <footer className="mt-auto border-t border-ink-150 bg-white/60 backdrop-blur-md py-6 text-center text-xs text-ink-500">
          <div className="mx-auto w-full max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© 2026 Antan Batura Watersports Tasik Shah Alam. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <NavLink to="/" className="hover:text-lagoon-600 transition-colors">Home</NavLink>
              <NavLink to="/book" className="hover:text-lagoon-600 transition-colors">Book Adventure</NavLink>
            </div>
          </div>
        </footer>
      )}
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
        strokeDasharray="2 2"
      />
    </svg>
  )
}

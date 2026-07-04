import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EquipmentIcon } from '../components/EquipmentIcon'
import clsx from 'clsx'

export function LandingPage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  
  const [activeCard, setActiveCard] = useState(0)
  const isAnimating = useRef(false)
  const startY = useRef(0)
  const accumulatedDeltaRef = useRef(0)
  const lastScrollInsideTime = useRef(0)
  
  const wheelResetTimeoutRef = useRef<any>(null)
  const cardCount = 4

  const nextCard = () => {
    if (activeCard < cardCount - 1 && !isAnimating.current) {
      isAnimating.current = true
      setActiveCard(prev => prev + 1)
      setTimeout(() => {
        isAnimating.current = false
      }, 850) // Lock matches transition duration
    }
  }

  const prevCard = () => {
    if (activeCard > 0 && !isAnimating.current) {
      isAnimating.current = true
      setActiveCard(prev => prev - 1)
      setTimeout(() => {
        isAnimating.current = false
      }, 850) // Lock matches transition duration
    }
  }

  // Handle touchpad and mouse scroll wheels with smooth cross-fade cross-overs
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // If target is inside scrollable sub-elements (like Juicer scroll list), let it scroll natively
      const target = e.target as HTMLElement
      const isInsideScrollable = target && target.closest('.juicer-feed, .custom-scrollbar')
      
      if (isInsideScrollable) {
        lastScrollInsideTime.current = Date.now()
        accumulatedDeltaRef.current = 0 // Clear any accumulated outer delta
        return
      }

      e.preventDefault()

      // If we recently scrolled inside a scrollable container, ignore remaining momentum decay events
      if (Date.now() - lastScrollInsideTime.current < 450) {
        accumulatedDeltaRef.current = 0
        return
      }

      if (isAnimating.current) return

      // Clear the debounce reset timer
      if (wheelResetTimeoutRef.current) {
        clearTimeout(wheelResetTimeoutRef.current)
      }

      // Accumulate the delta over time to support high-precision touchpad scrolling
      const scrollFactor = e.deltaMode === 1 ? 25 : 1
      accumulatedDeltaRef.current += e.deltaY * scrollFactor

      const threshold = 60 // Highly sensitive accumulated threshold

      if (accumulatedDeltaRef.current > threshold) {
        nextCard()
        accumulatedDeltaRef.current = 0
      } else if (accumulatedDeltaRef.current < -threshold) {
        prevCard()
        accumulatedDeltaRef.current = 0
      } else {
        // Reset the accumulated delta if scroll is inactive/stops for 150ms
        wheelResetTimeoutRef.current = setTimeout(() => {
          accumulatedDeltaRef.current = 0
        }, 150)
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', handleWheel)
      if (wheelResetTimeoutRef.current) {
        clearTimeout(wheelResetTimeoutRef.current)
      }
    }
  }, [activeCard])

  // Real-time mobile touch swiping calculations
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating.current) return
    startY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isAnimating.current) return
    const endY = e.changedTouches[0].clientY
    const deltaY = startY.current - endY

    const swipeThreshold = 50 // Minimum swipe distance in px
    if (Math.abs(deltaY) < swipeThreshold) return

    if (deltaY > 0) {
      nextCard()
    } else {
      prevCard()
    }
  }

  // Juicer.io embed assets injection & link capture redirection
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://assets.juicer.io/embed.css'
    link.type = 'text/css'
    link.media = 'all'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://assets.juicer.io/embed.js'
    script.type = 'text/javascript'
    script.async = true
    document.head.appendChild(script)

    // Capture click events inside Juicer container and redirect directly to original post in new window
    const handleJuicerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      if (anchor && anchor.href && !anchor.href.includes('juicer.io')) {
        e.preventDefault()
        e.stopPropagation()
        window.open(anchor.href, '_blank', 'noopener,noreferrer')
      }
    }

    const feed = document.querySelector('.juicer-feed')
    if (feed) {
      feed.addEventListener('click', handleJuicerClick as any, true)
    }

    return () => {
      document.head.removeChild(link)
      document.head.removeChild(script)
      if (feed) {
        feed.removeEventListener('click', handleJuicerClick as any, true)
      }
    }
  }, [])

  // Video Autoplay/Pause Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (videoRef.current) {
          if (entry.isIntersecting) {
            videoRef.current.play().catch((err) => {
              console.log('Video autoplay blocked by browser:', err)
            })
          } else {
            videoRef.current.pause()
          }
        }
      },
      { threshold: 0.4 }
    )

    const parent = document.getElementById('card-about-section')
    if (parent) observer.observe(parent)

    return () => {
      if (parent) observer.unobserve(parent)
    }
  }, [])

  const activities = [
    {
      title: 'Scenic Cruise Boat',
      price: 'From RM 10.00',
      desc: 'Relax on a guided motorboat cruise. Spot local bird species and enjoy the breeze.',
      icon: 'cruise_boat',
      bgColor: 'from-blue-500/10 to-cyan-500/10 border-blue-100',
      image: '/54525073_2121548324632578_5754671657360818176_n.jpg',
    },
    {
      title: 'Single Kayak',
      price: 'RM 10.00 / hr',
      desc: 'Adventure on your own terms. Ideal for fitness enthusiasts and solo explorers.',
      icon: 'kayak_single',
      bgColor: 'from-teal-500/10 to-emerald-500/10 border-teal-100',
      image: '/119224891_3319665018154230_4638296032617467692_n.jpg',
    },
    {
      title: 'Tandem Double Kayak',
      price: 'RM 20.00 / hr',
      desc: 'Share the experience. Perfect for couples or paddling together with friends.',
      icon: 'kayak_double',
      bgColor: 'from-sky-500/10 to-indigo-500/10 border-sky-100',
      image: '/119794891_3344677382319660_770689180630777863_n.jpg',
    },
    {
      title: 'Traditional Canoe',
      price: 'RM 15.00 / hr',
      desc: 'Classic open-deck canoe for a slower-paced, peaceful cruise on the lake.',
      icon: 'canoe',
      bgColor: 'from-purple-500/10 to-pink-500/10 border-purple-100',
      image: '/481108334_9306575286129810_1817337035231364376_n.jpg',
    },
    {
      title: 'Family Paddle Boats',
      price: 'RM 30.00 - 50.00 / hr',
      desc: 'Easy-to-use pedal boats. Fun and safe for kids and families of all sizes.',
      icon: 'paddle_boat',
      bgColor: 'from-amber-500/10 to-orange-500/10 border-amber-100',
      image: '/482988051_9357940974326574_3913749320365616332_n.jpg',
    },
  ]

  return (
    <div 
      className="h-screen w-full overflow-hidden relative bg-white select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sleek Right-aligned Navigation Dots */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3.5 z-30">
        {[0, 1, 2, 3].map((idx) => (
          <button
            key={idx}
            onClick={() => {
              if (isAnimating.current) return
              isAnimating.current = true
              setActiveCard(idx)
              setTimeout(() => {
                isAnimating.current = false
              }, 850)
            }}
            className={clsx(
              "w-3 h-3 rounded-full transition-all duration-300 border focus:outline-none",
              activeCard === 0
                ? idx === activeCard 
                  ? "bg-white border-white scale-125 shadow" 
                  : "bg-white/30 hover:bg-white/50 border-transparent hover:scale-110"
                : idx === activeCard 
                  ? "bg-lagoon-600 border-lagoon-600 scale-125" 
                  : "bg-black/20 hover:bg-black/40 border-transparent hover:scale-110"
            )}
            aria-label={`Go to page ${idx + 1}`}
          />
        ))}
      </div>

      {/* Card Deck Wrapper */}
      <div className="w-full h-full relative">
        {/* CARD 1: Full-page Hero */}
        <section 
          className={clsx(
            "absolute inset-0 w-full h-full flex items-center justify-center text-center px-4 overflow-hidden pt-16 transition-all duration-900 ease-in-out",
            activeCard === 0 
              ? "opacity-100 scale-100 z-10 pointer-events-auto" 
              : "opacity-0 scale-98 z-0 pointer-events-none"
          )}
        >
          <div 
            className="absolute inset-0 bg-cover bg-center z-0 will-change-transform transform-gpu"
            style={{ 
              backgroundImage: "url('/SA-masjid-sultan-salahuddin-tasik.jpg')" 
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-lagoon-900/30 via-slate-900/60 to-slate-950/85 z-10" />

          <div className="relative mx-auto max-w-3xl space-y-6 text-white z-20">
            <span className="inline-block rounded-full bg-slate-900/50 px-4.5 py-1.5 text-xs font-semibold uppercase tracking-wider border border-white/10">
              📍 Tasik Shah Alam Lake Gardens
            </span>
            
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6.5xl leading-none text-white drop-shadow-md font-display">
              Paddle, Cruise & Explore
            </h1>
            
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-lagoon-100 sm:text-base drop-shadow">
              Escape into the tranquil waters of Shah Alam’s premier recreational park. Create unforgettable memories with our top-quality kayaks, paddle boats, and lake cruises.
            </p>

            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate('/book')}
                className="px-6 py-3.5 text-base rounded-2xl font-bold bg-white text-lagoon-700 hover:bg-lagoon-50 transition-all transform hover:-translate-y-0.5 shadow-soft"
              >
                Book an Adventure
              </button>
              <button 
                type="button"
                onClick={nextCard}
                className="px-6 py-3.5 text-base rounded-2xl font-medium border border-white/40 text-white bg-transparent hover:bg-white/10 backdrop-blur-sm transition-all transform hover:-translate-y-0.5 shadow-soft"
              >
                Explore Watercrafts
              </button>
            </div>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 animate-bounce z-20">
            <span className="text-[9px] uppercase font-bold tracking-wider text-lagoon-200/80">Scroll to Explore</span>
            <svg className="h-4.5 w-4.5 text-lagoon-250" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-6l-7 7-7-7" />
            </svg>
          </div>
        </section>

        {/* CARD 2: Choose Your Watercraft */}
        <section 
          id="activities-showcase" 
          className={clsx(
            "absolute inset-0 w-full h-full flex items-center justify-center bg-[#f8fafc] border-t border-ink-200/80 shadow-soft px-6 py-8 transition-all duration-900 ease-in-out",
            activeCard === 1 
              ? "opacity-100 scale-100 z-10 pointer-events-auto" 
              : "opacity-0 scale-98 z-0 pointer-events-none"
          )}
        >
          <div className="max-w-6xl w-full mx-auto space-y-8">
            <div className="text-center space-y-1">
              <span className="text-xs font-bold text-lagoon-600 uppercase tracking-widest">Choose Your Craft</span>
              <h2 className="text-3xl font-extrabold text-ink-950 font-display">Watercraft Rentals & Pricing</h2>
              <p className="text-xs text-ink-500 max-w-md mx-auto">Rent by the hour. Life jackets are provided free of charge with every booking.</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {activities.map((act) => (
                <div
                  key={act.title}
                  className="flex flex-col rounded-3xl border border-ink-200 bg-white overflow-hidden shadow-sm hover:shadow-soft transition-all transform hover:-translate-y-1"
                >
                  <div className="relative h-32 overflow-hidden bg-lagoon-50 border-b border-ink-100">
                    <img 
                      src={act.image} 
                      alt={act.title} 
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-3 left-3 grid h-7 w-7 place-items-center rounded-lg bg-white/95 text-lagoon-600 shadow backdrop-blur-sm">
                      <EquipmentIcon type={act.icon as any} className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <h3 className="font-extrabold text-ink-950 text-xs leading-snug">{act.title}</h3>
                      <p className="text-[10px] text-ink-500 mt-1 leading-relaxed line-clamp-2">{act.desc}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-ink-100 pt-2.5">
                      <span className="text-xs font-bold text-lagoon-700">{act.price}</span>
                      <button
                        onClick={() => navigate(`/book?type=${act.icon}`)}
                        className="text-[10px] font-bold text-lagoon-600 hover:text-lagoon-850 flex items-center gap-0.5 uppercase tracking-wider hover:underline"
                      >
                        Book →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CARD 3: Our Environment */}
        <section 
          id="card-about-section"
          className={clsx(
            "absolute inset-0 w-full h-full flex items-center justify-center bg-white border-t border-ink-200/80 shadow-soft px-6 transition-all duration-900 ease-in-out",
            activeCard === 2 
              ? "opacity-100 scale-100 z-10 pointer-events-auto" 
              : "opacity-0 scale-98 z-0 pointer-events-none"
          )}
        >
          <div className="grid gap-12 md:grid-cols-2 items-center max-w-6xl w-full mx-auto">
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold text-lagoon-600 uppercase tracking-widest">Our Environment</span>
                <h2 className="text-3xl font-extrabold text-ink-950 font-display">A Pristine Sanctuary in the Heart of Shah Alam</h2>
              </div>
              <p className="text-xs leading-relaxed text-ink-600">
                Taman Tasik Shah Alam is a historic public park composed of three scenic, interconnected man-made lakes. Surrounded by lush tropical gardens, jogging tracks, and walking trails, it serves as the city’s green lung.
              </p>
              <p className="text-xs leading-relaxed text-ink-600">
                Whether you are looking to get a heart-pumping kayak workout, paddle leisurely in a pedal boat with family, or capture panoramic sunset photos of the famous Blue Mosque across the water, Antan Batura provides the perfect gateway.
              </p>
              
              <div className="flex items-center gap-6 pt-1">
                <div className="text-center">
                  <p className="text-xl font-bold text-lagoon-700 font-display">8:30 AM</p>
                  <p className="text-[9px] text-ink-500 uppercase tracking-wider font-semibold">Opening Time</p>
                </div>
                <div className="h-8 w-px bg-ink-200" />
                <div className="text-center">
                  <p className="text-xl font-bold text-lagoon-700 font-display">7:15 PM</p>
                  <p className="text-[9px] text-ink-500 uppercase tracking-wider font-semibold">Closing Time</p>
                </div>
                <div className="h-8 w-px bg-ink-200" />
                <div className="text-center">
                  <p className="text-xl font-bold text-lagoon-700 font-display">Open Daily</p>
                  <p className="text-[9px] text-ink-500 uppercase tracking-wider font-semibold">Mon – Sun</p>
                </div>
              </div>

              <div className="border-t border-ink-150 pt-4 space-y-3">
                <p className="text-[10px] font-bold text-ink-700 uppercase tracking-wider">Connect & Follow Us</p>
                <div className="flex flex-wrap items-center gap-3">
                  <a 
                    href="https://www.facebook.com/AntanBaturaWatersport" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-semibold text-ink-700 hover:text-blue-600 transition-colors border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white shadow-sm hover:shadow-soft"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook Page
                  </a>
                  <a 
                    href="https://www.instagram.com/antanbaturawatersport/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-semibold text-ink-700 hover:text-pink-600 transition-colors border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white shadow-sm hover:shadow-soft"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                    Instagram Page
                  </a>
                  <a 
                    href="https://www.tiktok.com/@antanbaturawatersport" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-semibold text-ink-700 hover:text-black transition-colors border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white shadow-sm hover:shadow-soft"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.94-1.74-.22-.2-.43-.43-.62-.67-.02 3.22-.01 6.44-.02 9.65-.07 2.44-.9 4.95-2.73 6.64-1.9 1.77-4.66 2.37-7.14 1.94-2.83-.47-5.32-2.57-6.09-5.38-.95-3.37.52-7.23 3.61-8.73 1.17-.58 2.49-.8 3.79-.71V12.3c-1.63-.14-3.37.4-4.44 1.69-.99 1.17-1.25 2.87-.78 4.35.43 1.43 1.74 2.58 3.22 2.81 1.48.24 3.09-.34 3.86-1.66.45-.76.59-1.66.57-2.53-.02-3.86-.01-7.72-.01-11.58.11-1.89.92-3.82 2.42-5.06 1.15-.97 2.65-1.54 4.18-1.59Z"/>
                    </svg>
                    TikTok Page
                  </a>
                  <span className="text-ink-700 font-bold text-xs bg-lagoon-50 border border-lagoon-100 rounded-xl px-3.5 py-2.5">
                    📞 Call: +60 19-208 8884
                  </span>
                </div>
              </div>
            </div>

            {/* Social Video Section with Auto-play / Intersection Observer */}
            <div className="relative rounded-3xl overflow-hidden shadow-soft aspect-video border border-ink-200 bg-black flex items-center justify-center">
              <video 
                ref={videoRef}
                src="/AQMy6rnzzQ9iNjfnlvAaW7dmMk-Rbq2gfEtYUqBph6FOgC07g424ooDS5ge6yqW9rbtZvt8R12SXoarUNXOGbaeIlrHXA_snCU1CXqeafdUNJw.mp4"
                className="absolute inset-0 h-full w-full object-cover"
                loop
                muted
                playsInline
              />
              <div className="absolute inset-0 bg-black/15 hover:bg-black/25 transition-all flex flex-col justify-end p-4 z-10">
                <a 
                  href="https://www.facebook.com/AntanBaturaWatersport/videos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-start rounded-full bg-white/95 px-3.5 py-2 text-[9px] font-bold text-lagoon-700 hover:text-lagoon-900 shadow-md backdrop-blur-sm flex items-center gap-1 border border-white"
                >
                  <span>📺 Watch Reels on Facebook</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* CARD 4: Facebook/Instagram Live Social Stream via Juicer.io */}
        <section 
          className={clsx(
            "absolute inset-0 w-full h-full flex items-center justify-center bg-[#f8fafc] border-t border-ink-200/80 shadow-soft px-6 py-10 transition-all duration-900 ease-in-out",
            activeCard === 3 
              ? "opacity-100 scale-100 z-10 pointer-events-auto" 
              : "opacity-0 scale-98 z-0 pointer-events-none"
          )}
        >
          <div className="max-w-6xl w-full mx-auto space-y-8">
            <div className="flex items-end justify-between border-b border-ink-150 pb-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-lagoon-600 uppercase tracking-widest">Social Media Stream</span>
                <h2 className="text-3xl font-extrabold text-ink-950 font-display">Live Social Feed</h2>
              </div>
              <span className="text-xxs font-semibold text-ink-500">Facebook & Instagram</span>
            </div>

            {/* Juicer.io Widget Embed Container */}
            <div className="w-full h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
              <ul 
                className="juicer-feed" 
                data-feed-id="antanbaturawatersport" 
                data-per="6"
                data-columns="3"
              >
                <div className="text-center py-20 text-xs text-ink-500 animate-pulse">
                  Connecting to Juicer.io feed stream...
                </div>
              </ul>
            </div>

            {/* Compact snapped slide deck footer */}
            <div className="border-t border-ink-150 pt-4 flex flex-col sm:flex-row items-center justify-between text-xxs text-ink-500 gap-2">
              <p>© 2026 Antan Batura Watersports Tasik Shah Alam. All rights reserved.</p>
              <div className="flex items-center gap-3 font-semibold">
                <a href="https://www.facebook.com/AntanBaturaWatersport" target="_blank" rel="noopener noreferrer" className="hover:text-lagoon-600 transition-colors">Facebook</a>
                <a href="https://www.instagram.com/antanbaturawatersport/" target="_blank" rel="noopener noreferrer" className="hover:text-lagoon-600 transition-colors">Instagram</a>
                <a href="https://www.tiktok.com/@antanbaturawatersport" target="_blank" rel="noopener noreferrer" className="hover:text-lagoon-600 transition-colors">TikTok</a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

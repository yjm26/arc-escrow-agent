import { Link } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'

function useCountUp(target, duration = 1200, delay = 0) {
  const [val, setVal] = useState('0')
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    const start = performance.now() + delay
    const numeric = parseFloat(target.replace(/[^0-9.]/g, '')) || 0
    const prefix = target.match(/^[^0-9.]*/)?.[0] || ''
    const suffix = target.match(/[^0-9.]*$/)?.[0] || ''
    const isInt = !target.includes('.')

    let raf
    const tick = (now) => {
      if (now < start) { raf = requestAnimationFrame(tick); return }
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = numeric * eased
      const formatted = isInt
        ? Math.floor(current).toLocaleString()
        : current.toFixed(numeric < 1 ? 2 : 1)
      setVal(prefix + formatted + suffix)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    hasRun.current = true
    return () => cancelAnimationFrame(raf)
  }, [target, duration, delay])

  return val
}

/* ── 3D floating escrow wireframe icons ── */
const LockIcon = ({ className }) => (
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="0.8" className={className}>
    <rect x="12" y="28" width="40" height="32" rx="3" />
    <path d="M20 28V18a12 12 0 0 1 24 0v10" />
    <circle cx="32" cy="44" r="4" />
    <line x1="32" y1="48" x2="32" y2="52" />
  </svg>
)
const ShieldIcon = ({ className }) => (
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="0.8" className={className}>
    <path d="M8 12c0 24 12 40 24 40s24-16 24-40L32 4 8 12z" />
    <path d="M20 28c4 8 8 12 12 12s8-4 12-12" />
  </svg>
)
const ChainIcon = ({ className }) => (
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="0.8" className={className}>
    <ellipse cx="22" cy="22" rx="10" ry="14" transform="rotate(-45 22 22)" />
    <ellipse cx="42" cy="42" rx="10" ry="14" transform="rotate(-45 42 42)" />
    <line x1="28" y1="28" x2="36" y2="36" />
  </svg>
)
const HandshakeIcon = ({ className }) => (
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="0.8" className={className}>
    <path d="M8 36l8-8 8 8 8-8 8 8 8-8" />
    <path d="M16 28v-8c0-6 6-10 12-10h8c6 0 12 4 12 10v8" />
    <path d="M12 36h40v8a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4v-8z" />
  </svg>
)

export default function Hero({ wallet, onConnect }) {
  const stats = [
    { val: '$0.01', label: 'Per tx', delay: 900 },
    { val: '1%', label: 'Fee only', delay: 1050 },
    { val: '<1s', label: 'Finality', delay: 1200 },
    { val: '0', label: 'Middleman', delay: 1350 },
  ]

  return (
    <section className="relative pt-28 pb-20 px-4 sm:px-6 overflow-hidden">
      {/* ─── 3D Background Layer ─── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Perspective floor grid — trading floor vibe */}
        <div className="absolute bottom-0 left-0 right-0 h-[70%] perspective-grid opacity-[0.07] dark:opacity-[0.12]">
          <div className="perspective-grid-inner w-full h-[200%] relative">
            <div className="absolute inset-0 animate-grid-move">
              {/* Horizontal lines moving down */}
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 h-px bg-current"
                  style={{ top: `${i * 60}px` }}
                />
              ))}
            </div>
            {/* Vertical perspective lines */}
            {[-40, -20, 0, 20, 40, 60, 80, 100, 120].map((pct, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-current"
                style={{ left: `${pct}%` }}
              />
            ))}
            {/* Horizon line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-current opacity-40" />
          </div>
        </div>

        {/* Floating escrow wireframes — very subtle */}
        <div className="absolute inset-0 text-stripe-navy dark:text-white">
          <LockIcon    className="absolute top-[18%] left-[8%]  w-16 h-16 opacity-[0.06] dark:opacity-[0.10] float-3d-1" />
          <ShieldIcon  className="absolute top-[12%] right-[12%] w-20 h-20 opacity-[0.05] dark:opacity-[0.09] float-3d-2" />
          <ChainIcon   className="absolute top-[55%] left-[6%]  w-14 h-14 opacity-[0.05] dark:opacity-[0.08] float-3d-3" />
          <HandshakeIcon className="absolute top-[48%] right-[8%] w-16 h-16 opacity-[0.04] dark:opacity-[0.07] float-3d-1" style={{ animationDelay: '-5s' }} />
          <LockIcon    className="absolute top-[8%]  left-[45%] w-10 h-10 opacity-[0.04] dark:opacity-[0.06] float-3d-2" style={{ animationDelay: '-8s' }} />
          <ChainIcon   className="absolute top-[65%] right-[25%] w-12 h-12 opacity-[0.04] dark:opacity-[0.06] float-3d-3" style={{ animationDelay: '-3s' }} />
        </div>

        {/* Fine dot-grid overlay (kept but subdued) */}
        <svg
          className="absolute w-full h-full opacity-[0.10] dark:opacity-[0.18]"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern id="dot-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="60" stroke="currentColor" strokeWidth="0.6" opacity="0.35" />
              <line x1="30" y1="0" x2="30" y2="60" stroke="currentColor" strokeWidth="0.6" opacity="0.35" />
              <line x1="0" y1="0" x2="60" y2="0" stroke="currentColor" strokeWidth="0.6" opacity="0.35" />
              <line x1="0" y1="30" x2="60" y2="30" stroke="currentColor" strokeWidth="0.6" opacity="0.35" />
              <circle cx="0" cy="0" r="1.2" fill="currentColor" opacity="0.5" />
              <circle cx="30" cy="0" r="1.2" fill="currentColor" opacity="0.5" />
              <circle cx="0" cy="30" r="1.2" fill="currentColor" opacity="0.5" />
              <circle cx="30" cy="30" r="1.5" fill="currentColor" opacity="0.55" />
              <circle cx="15" cy="15" r="0.8" fill="currentColor" opacity="0.3" />
              <circle cx="45" cy="15" r="0.8" fill="currentColor" opacity="0.3" />
              <circle cx="15" cy="45" r="0.8" fill="currentColor" opacity="0.3" />
              <circle cx="45" cy="45" r="0.8" fill="currentColor" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>

        {/* Large faded focal dot cluster — slow pulse */}
        <svg
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] animate-slow-pulse"
          viewBox="0 0 300 300"
        >
          <circle cx="150" cy="150" r="40" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.35" />
          <circle cx="150" cy="150" r="70" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.25" />
          <circle cx="150" cy="150" r="100" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.18" />
          <line x1="150" y1="150" x2="150" y2="50" stroke="currentColor" strokeWidth="0.7" opacity="0.3" strokeDasharray="3 2" />
          <line x1="150" y1="150" x2="220" y2="80" stroke="currentColor" strokeWidth="0.7" opacity="0.3" strokeDasharray="3 2" />
          <line x1="150" y1="150" x2="250" y2="150" stroke="currentColor" strokeWidth="0.7" opacity="0.3" strokeDasharray="3 2" />
          <line x1="150" y1="150" x2="220" y2="220" stroke="currentColor" strokeWidth="0.7" opacity="0.3" strokeDasharray="3 2" />
          <line x1="150" y1="150" x2="150" y2="250" stroke="currentColor" strokeWidth="0.7" opacity="0.3" strokeDasharray="3 2" />
          <line x1="150" y1="150" x2="80" y2="220" stroke="currentColor" strokeWidth="0.7" opacity="0.3" strokeDasharray="3 2" />
          <line x1="150" y1="150" x2="50" y2="150" stroke="currentColor" strokeWidth="0.7" opacity="0.3" strokeDasharray="3 2" />
          <line x1="150" y1="150" x2="80" y2="80" stroke="currentColor" strokeWidth="0.7" opacity="0.3" strokeDasharray="3 2" />
          <circle cx="150" cy="50" r="2" fill="currentColor" opacity="0.35" />
          <circle cx="250" cy="150" r="2" fill="currentColor" opacity="0.35" />
          <circle cx="150" cy="250" r="2" fill="currentColor" opacity="0.35" />
          <circle cx="50" cy="150" r="2" fill="currentColor" opacity="0.35" />
          <circle cx="220" cy="80" r="1.5" fill="currentColor" opacity="0.3" />
          <circle cx="220" cy="220" r="1.5" fill="currentColor" opacity="0.3" />
          <circle cx="80" cy="220" r="1.5" fill="currentColor" opacity="0.3" />
          <circle cx="80" cy="80" r="1.5" fill="currentColor" opacity="0.3" />
        </svg>
      </div>

      <div className="relative z-10 max-w-[1100px] mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        {/* Left — Text */}
        <div className="flex-1 text-center lg:text-left">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-white/5 border border-stripe-border dark:border-white/10 rounded-md text-[12px] font-medium text-stripe-body dark:text-gray-400 mb-8 animate-slide-in-left"
            style={{ animationDelay: '0.15s' }}
          >
            <span className="w-1.5 h-1.5 bg-stripe-success rounded-full animate-pulse" />
            Live on Arc Testnet
          </div>

          <h1
            className="text-[clamp(48px,7vw,80px)] font-light leading-[1.02] mb-5 text-stripe-navy dark:text-white animate-fade-in-up"
            style={{ letterSpacing: '-1.6px', fontFeatureSettings: '"ss01"', animationDelay: '0.3s' }}
          >
            Trust,<br />automated.
          </h1>

          <p
            className="text-[17px] font-light text-stripe-body dark:text-gray-400 leading-[1.5] mb-10 max-w-[400px] mx-auto lg:mx-0 animate-fade-in-up"
            style={{ animationDelay: '0.45s' }}
          >
            Trustless escrow for strangers. No middleman, no trust needed. Just a smart contract on Arc.
          </p>

          <div
            className="flex gap-3 justify-center lg:justify-start animate-fade-in-up"
            style={{ animationDelay: '0.6s' }}
          >
            <Link
              to="/market"
              className="btn-primary flex items-center gap-2 px-7 py-3 text-[15px] relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                Browse Market
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 7H13M13 7L7 1M13 7L7 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className="absolute inset-0 animate-shimmer pointer-events-none" />
            </Link>
            {!wallet && (
              <button onClick={onConnect} className="btn-ghost px-5 py-3 text-[15px]">Connect Wallet</button>
            )}
          </div>

          {/* Stats row */}
          <div className="flex gap-8 mt-10 justify-center lg:justify-start">
            {stats.map((s) => (
              <StatItem key={s.label} val={s.val} label={s.label} delay={s.delay} />
            ))}
          </div>
        </div>

        {/* Right — Preview Card */}
        <div
          className="flex-1 max-w-[480px] w-full animate-fade-in-up"
          style={{ animationDelay: '0.7s' }}
        >
          <div className="card-3d overflow-hidden animate-float-soft">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-5 py-3 bg-stripe-surface dark:bg-white/5 border-b border-stripe-border dark:border-white/10">
              <div className="w-2.5 h-2.5 rounded-full bg-red-300/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-300/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-300/80" />
              <div className="ml-4 flex-1 h-5 bg-white dark:bg-white/5 border border-stripe-border dark:border-white/10 rounded text-[10px] font-mono text-stripe-body dark:text-gray-500 flex items-center px-3">
                bond.app/room/42
              </div>
            </div>

            {/* Deal content */}
            <div className="p-5 text-left">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-stripe-navy dark:bg-white flex items-center justify-center">
                    <span className="text-white dark:text-[#0c0f1a] text-[10px] font-bold font-mono">B</span>
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-stripe-navy dark:text-white">Room #42</div>
                    <div className="text-[12px] text-stripe-body dark:text-gray-500">Landing page redesign</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded text-[10px] font-semibold tracking-wider text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                  FUNDED
                </span>
              </div>

              {/* Price breakdown */}
              <div className="border border-stripe-border dark:border-white/10 rounded-md mb-4">
                {[
                  { label: 'Item price', value: '500.0 USDC' },
                  { label: 'Fee (1%)', value: '5.0 USDC' },
                  { label: 'Total to fund', value: '505.0 USDC', bold: true },
                ].map((item, i) => (
                  <div key={item.label} className={`flex justify-between text-[13px] px-4 py-2.5 ${i < 2 ? 'border-b border-stripe-border dark:border-white/10' : ''} ${item.bold ? 'font-medium' : ''}`}>
                    <span className="text-stripe-body dark:text-gray-500">{item.label}</span>
                    <span className="text-stripe-navy dark:text-gray-200 font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-stripe-body dark:text-gray-500 text-center mt-2">
                Escrow: 500.0 USDC | Fee to treasury: 5.0 USDC
              </div>

              {/* Parties */}
              <div className="border border-stripe-border dark:border-white/10 rounded-md mb-4">
                <div className="px-4 py-2 border-b border-stripe-border dark:border-white/10">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stripe-body dark:text-gray-500">Parties</span>
                </div>
                {[
                  { addr: '0xF871\u20267AF3', role: 'Seller', you: true },
                  { addr: '0xAb12\u20269c34', role: 'Buyer', you: false },
                ].map((p, i) => (
                  <div key={i} className={`flex justify-between items-center px-4 py-2.5 ${i === 0 ? 'border-b border-stripe-border dark:border-white/10' : ''}`}>
                    <div>
                      <span className="text-[13px] text-stripe-navy dark:text-gray-200 font-mono">{p.addr}</span>
                      {p.you && <span className="ml-2 text-[10px] text-purple-600 dark:text-purple-400 font-medium">(you)</span>}
                    </div>
                    <span className="text-[12px] text-stripe-body dark:text-gray-500">{p.role}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <div className="flex-1 bg-stripe-navy dark:bg-white text-white dark:text-[#0c0f1a] text-center py-2.5 rounded-md text-[13px] font-medium">Release</div>
                <div className="flex-1 bg-transparent border border-stripe-border dark:border-white/10 text-stripe-body dark:text-gray-400 text-center py-2.5 rounded-md text-[13px] font-medium">Dispute</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function StatItem({ val, label, delay }) {
  const count = useCountUp(val, 1000, delay)
  return (
    <div
      className="text-center lg:text-left animate-count-pop"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-[20px] font-semibold text-stripe-navy dark:text-white font-mono leading-none tracking-tight">{count}</div>
      <div className="text-[10px] text-stripe-body dark:text-gray-500 uppercase tracking-wider mt-1">{label}</div>
    </div>
  )
}

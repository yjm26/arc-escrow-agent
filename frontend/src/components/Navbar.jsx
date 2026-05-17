import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getContract, CONTRACT_ADDRESS } from '../utils/contract'
import NotificationBell from './NotificationBell'
import ThemeToggle from './ThemeToggle'

export default function Navbar({ onConnect, wallet, connecting, onDisconnect }) {
  const navigate = useNavigate()
  const [showWalletMenu, setShowWalletMenu] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!wallet) { setIsAdmin(false); return }
    const provider = wallet.provider
    const contract = getContract(provider)
    let stale = false
    Promise.all([
      contract.owner().catch(() => ''),
      contract.arbiter().catch(() => ''),
    ]).then(([owner, arbiter]) => {
      if (stale) return
      const addr = wallet.address.toLowerCase()
      setIsAdmin(addr === owner.toLowerCase() || addr === arbiter.toLowerCase())
    })
    return () => { stale = true }
  }, [wallet])

  // Close mobile menu on route change (listen to pathname)
  useEffect(() => {
    setMobileOpen(false)
  }, [typeof window !== 'undefined' ? window.location.pathname : ''])

  const scrollToHow = (e) => {
    e.preventDefault()
    const isHome = window.location.pathname === '/' || window.location.pathname === ''
    if (!isHome) {
      navigate('/')
      setTimeout(() => {
        const el = document.getElementById('how')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 350)
    } else {
      const el = document.getElementById('how')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-4 bg-[#faf9f7]/95 dark:bg-[#0c0f1a]/95 backdrop-blur-xl border-b border-stripe-border dark:border-white/10">
      <Link to="/" className="flex items-center gap-2.5">
        <div className="w-7 h-7 bg-stripe-navy dark:bg-white rounded-md flex items-center justify-center">
          <span className="text-white dark:text-[#0c0f1a] text-xs font-bold font-mono">B</span>
        </div>
        <span className="font-semibold text-[17px] tracking-tight text-stripe-navy dark:text-white">BOND</span>
      </Link>

      {/* Desktop nav — slim: How it works, Docs, Market only */}
      <button className="md:hidden p-2 text-stripe-navy dark:text-white" onClick={() => setMobileOpen(!mobileOpen)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </button>
      <div className="hidden md:flex items-center gap-7">
        <a href="#how" onClick={scrollToHow} className="text-[14px] font-medium text-stripe-body hover:text-stripe-navy dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer">How it works</a>
        <Link to="/docs" className="text-[14px] font-medium text-stripe-body hover:text-stripe-navy dark:text-gray-400 dark:hover:text-white transition-colors">Docs</Link>
        <Link to="/market" className="text-[14px] font-medium text-stripe-body hover:text-stripe-navy dark:text-gray-400 dark:hover:text-white transition-colors">Market</Link>

        {isAdmin && (
          <Link to="/arbiter" className="text-[14px] font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors">
            Arbiter
          </Link>
        )}

        <ThemeToggle />

        {wallet ? (
          <>
            <Link to="/rooms" className="text-[14px] font-medium text-stripe-body hover:text-stripe-navy dark:text-gray-400 dark:hover:text-white transition-colors">
              My Rooms
            </Link>
            <Link to="/offers" className="text-[14px] font-medium text-stripe-body hover:text-stripe-navy dark:text-gray-400 dark:hover:text-white transition-colors">
              Offers
            </Link>
            <div className="relative">
              <button onClick={() => setShowWalletMenu(!showWalletMenu)} className="flex items-center gap-2 px-4 py-2 bg-stripe-surface dark:bg-white/5 border border-stripe-border dark:border-white/10 rounded-md text-[13px] font-mono hover:border-stripe-navy dark:hover:border-white/20 transition">
                <span className="w-2 h-2 bg-stripe-success rounded-full" />
                {isAdmin && <span className="text-[9px] bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold tracking-wider">ADMIN</span>}
                <span className="text-stripe-navy dark:text-gray-200">
                  {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
                </span>
                <svg className="w-3 h-3 text-zinc-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showWalletMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowWalletMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#1a1d2e] border border-stripe-border dark:border-white/10 rounded-md shadow-lg z-50 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-stripe-border dark:border-white/10">
                      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-500 mb-0.5">Connected</div>
                      <div className="font-mono text-[12px] text-stripe-navy dark:text-gray-200">{wallet.address.slice(0, 10)}…{wallet.address.slice(-6)}</div>
                    </div>
                    <a href={`https://testnet.arcscan.app/address/${wallet.address}`} target="_blank" rel="noopener" className="block px-4 py-2.5 text-[13px] text-stripe-body hover:bg-stripe-surface hover:text-stripe-navy dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white transition">
                      View on Explorer
                    </a>
                    <button onClick={() => { onDisconnect(); setShowWalletMenu(false) }} className="w-full text-left px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition">
                      Disconnect
                    </button>
                  </div>
                </>
              )}
            </div>
            <NotificationBell wallet={wallet} />
            <Link to="/create" className="btn-primary text-[14px]">
              Create Room
            </Link>
          </>
        ) : (
          <button onClick={onConnect} disabled={connecting} className="btn-primary">
            {connecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        )}
      </div>
      {/* Mobile menu */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMobileOpen(false)} />
          <div className="md:hidden fixed top-[60px] left-0 right-0 bg-[#faf9f7] dark:bg-[#0c0f1a] border-b border-stripe-border dark:border-white/10 p-6 space-y-4 z-40">
            <a href="#how" onClick={(e) => { scrollToHow(e); setMobileOpen(false) }} className="block text-[14px] font-medium text-stripe-body dark:text-gray-400 cursor-pointer">How it works</a>
            <Link to="/docs" className="block text-[14px] font-medium text-stripe-body dark:text-gray-400" onClick={() => setMobileOpen(false)}>Docs</Link>
            <Link to="/market" className="block text-[14px] font-medium text-stripe-body dark:text-gray-400" onClick={() => setMobileOpen(false)}>Market</Link>
            {isAdmin && (
              <Link to="/arbiter" className="block text-[14px] font-medium text-red-600 dark:text-red-400" onClick={() => setMobileOpen(false)}>Arbiter</Link>
            )}
            <div onClick={() => setMobileOpen(false)}><ThemeToggle /></div>
            {wallet ? (
              <>
                <Link to="/rooms" className="block text-[14px] font-medium text-stripe-body dark:text-gray-400" onClick={() => setMobileOpen(false)}>My Rooms</Link>
                <Link to="/offers" className="block text-[14px] font-medium text-stripe-body dark:text-gray-400" onClick={() => setMobileOpen(false)}>Offers</Link>
                <Link to="/create" className="btn-primary block text-center text-[14px]" onClick={() => setMobileOpen(false)}>Create Room</Link>
              </>
            ) : (
              <button onClick={() => { onConnect(); setMobileOpen(false) }} disabled={connecting} className="btn-primary w-full">
                {connecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </>
      )}
    </nav>
  )
}

import { ESCROW_ADDRESS } from '../lib/contract'

export default function Navbar({ onLaunch }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-5 bg-bg/80 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <span className="bg-fg text-bg px-2 py-0.5 font-mono text-xs font-bold">B</span>
        <span className="font-bold text-lg tracking-tight">BOND</span>
      </div>

      <div className="hidden md:flex items-center gap-8">
        <a href="#how" className="text-sm text-muted hover:text-fg transition-colors">How it works</a>
        <a href="#app" className="text-sm text-muted hover:text-fg transition-colors">App</a>
        <a
          href={`https://testnet.arcscan.app/address/${ESCROW_ADDRESS}`}
          target="_blank"
          rel="noopener"
          className="text-sm text-muted hover:text-fg transition-colors"
        >
          Contract
        </a>
        <a
          href="https://github.com/yjm26/arc-escrow-agent"
          target="_blank"
          rel="noopener"
          className="text-sm text-muted hover:text-fg transition-colors"
        >
          GitHub
        </a>
        <button
          onClick={onLaunch}
          className="bg-fg text-bg px-5 py-2 rounded-full text-sm font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all"
        >
          Launch App
        </button>
      </div>
    </nav>
  )
}

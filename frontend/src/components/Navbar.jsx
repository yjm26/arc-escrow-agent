import { ESCROW_ADDRESS } from '../lib/contract'

export default function Navbar({ onLaunch }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-4 bg-white/90 backdrop-blur-xl border-b border-stripe-border">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 bg-stripe-navy rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold font-mono">B</span>
        </div>
        <span className="font-semibold text-[17px] tracking-tight text-stripe-navy">BOND</span>
      </div>

      <div className="hidden md:flex items-center gap-7">
        <a href="#how" className="text-[14px] font-medium text-stripe-body hover:text-stripe-navy transition-colors">How it works</a>
        <a href="#app" className="text-[14px] font-medium text-stripe-body hover:text-stripe-navy transition-colors">App</a>
        <a
          href={`https://testnet.arcscan.app/address/${ESCROW_ADDRESS}`}
          target="_blank"
          rel="noopener"
          className="text-[14px] font-medium text-stripe-body hover:text-stripe-navy transition-colors"
        >
          Contract
        </a>
        <a
          href="https://github.com/yjm26/arc-escrow-agent"
          target="_blank"
          rel="noopener"
          className="text-[14px] font-medium text-stripe-body hover:text-stripe-navy transition-colors"
        >
          GitHub
        </a>
        <button onClick={onLaunch} className="btn-primary ml-1">
          Launch App
        </button>
      </div>
    </nav>
  )
}

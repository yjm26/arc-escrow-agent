import { BONDROOM_ADDRESS } from '../lib/contract'

export default function Navbar({ onConnect, wallet, connecting }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-4 bg-white/95 backdrop-blur-xl border-b border-stripe-border">
      <a href="/" className="flex items-center gap-2.5">
        <div className="w-7 h-7 bg-stripe-navy rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold font-mono">B</span>
        </div>
        <span className="font-semibold text-[17px] tracking-tight text-stripe-navy">BOND</span>
      </a>

      <div className="hidden md:flex items-center gap-7">
        <a href="/#how" className="text-[14px] font-medium text-stripe-body hover:text-stripe-navy transition-colors">How it works</a>
        <a
          href={`https://testnet.arcscan.app/address/${BONDROOM_ADDRESS}`}
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

        {wallet ? (
          <>
            <a href="/rooms" className="text-[14px] font-medium text-stripe-body hover:text-stripe-navy transition-colors">
              My Rooms
            </a>
            <div
              className="flex items-center gap-2 px-4 py-2 bg-stripe-surface border border-stripe-border rounded text-[13px] font-mono"
              style={{ boxShadow: '0 2px 8px rgba(50,50,93,0.12)' }}
            >
              <span className="w-2 h-2 bg-stripe-success rounded-full" />
              <span className="text-stripe-purple font-medium">
                {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
              </span>
            </div>
            <a href="/create" className="btn-primary text-[14px]">
              Create Room
            </a>
          </>
        ) : (
          <button onClick={onConnect} disabled={connecting} className="btn-primary">
            {connecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </nav>
  )
}

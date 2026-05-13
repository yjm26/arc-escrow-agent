export default function ConnectWallet({ onConnect, loading, error }) {
  return (
    <div className="card-3d p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-lg bg-stripe-surface border border-stripe-border flex items-center justify-center" style={{ boxShadow: '0 4px 12px rgba(50,50,93,0.1)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="6" width="18" height="13" rx="2" stroke="#061b31" strokeWidth="1.5"/>
          <path d="M3 10h18" stroke="#061b31" strokeWidth="1.5"/>
          <circle cx="17" cy="14" r="1.5" fill="#061b31"/>
        </svg>
      </div>
      <h3 className="text-[20px] font-light text-stripe-navy mb-2" style={{ letterSpacing: '-0.22px' }}>
        Connect your wallet
      </h3>
      <p className="text-[14px] font-light text-stripe-body mb-8 max-w-[320px] mx-auto">
        Connect MetaMask, Coinbase Wallet, or any supported wallet to interact with BOND.
      </p>
      <button onClick={onConnect} disabled={loading} className="btn-primary w-full max-w-[280px] mx-auto py-3">
        {loading ? 'Connecting…' : 'Connect Wallet'}
      </button>
      {error && (
        <div className="mt-4 px-4 py-2.5 rounded bg-red-50 border border-red-100 text-[13px] text-red-600 font-medium" style={{ boxShadow: '0 2px 6px rgba(220,38,38,0.08)' }}>
          {error}
        </div>
      )}
    </div>
  )
}

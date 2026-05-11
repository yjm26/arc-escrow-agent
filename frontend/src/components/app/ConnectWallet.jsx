export default function ConnectWallet({ onConnect, loading, error }) {
  return (
    <div
      className="bg-white border border-stripe-border rounded-lg p-8 text-center"
      style={{ boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px' }}
    >
      <div className="w-14 h-14 mx-auto mb-5 rounded-lg bg-stripe-surface border border-stripe-border flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="6" width="18" height="13" rx="2" stroke="#533afd" strokeWidth="1.5"/>
          <path d="M3 10h18" stroke="#533afd" strokeWidth="1.5"/>
          <circle cx="17" cy="14" r="1.5" fill="#533afd"/>
        </svg>
      </div>
      <h3
        className="text-[18px] font-light text-stripe-navy mb-2"
        style={{ letterSpacing: '-0.22px' }}
      >
        Connect your wallet
      </h3>
      <p className="text-[14px] font-light text-stripe-body mb-6">
        You need MetaMask or a compatible wallet to interact with the escrow contract.
      </p>
      <button
        onClick={onConnect}
        disabled={loading}
        className="btn-primary w-full max-w-[280px] mx-auto py-3"
      >
        {loading ? 'Connecting…' : 'Connect Wallet'}
      </button>
      {error && (
        <div className="mt-4 px-4 py-2.5 rounded bg-red-50 border border-red-100 text-[13px] text-red-600 font-medium">
          {error}
        </div>
      )}
    </div>
  )
}

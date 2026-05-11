export default function ConnectWallet({ onConnect, loading, error }) {
  return (
    <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 text-center">
      <button
        onClick={onConnect}
        disabled={loading}
        className="w-full max-w-[280px] mx-auto bg-accent text-white py-3 rounded-xl text-sm font-semibold hover:opacity-90 hover:-translate-y-px transition-all disabled:opacity-50"
      >
        {loading ? 'Connecting…' : 'Connect Wallet'}
      </button>
      {error && (
        <div className="mt-3 text-sm text-red font-medium">{error}</div>
      )}
    </div>
  )
}

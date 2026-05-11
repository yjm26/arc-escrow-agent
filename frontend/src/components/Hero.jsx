export default function Hero({ onOpenApp }) {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 relative overflow-hidden">
      {/* subtle glow */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(0,102,255,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#f0f0ee] border border-border rounded-full text-xs text-muted mb-8">
        <span className="w-1.5 h-1.5 bg-green rounded-full animate-pulse" />
        Live on Arc Testnet
      </div>

      <h1 className="text-[clamp(48px,8vw,96px)] font-bold tracking-tight leading-[1] max-w-[800px] mb-6">
        Trust, automated.
      </h1>

      <p className="text-lg text-muted max-w-md leading-relaxed mb-12">
        Trustless escrow for strangers. No middleman, no fees, no trust needed. Just a $0.01 smart contract on Arc.
      </p>

      <div className="flex gap-3">
        <button
          onClick={onOpenApp}
          className="bg-fg text-bg px-8 py-3.5 rounded-full text-[15px] font-semibold hover:-translate-y-0.5 hover:shadow-xl transition-all"
        >
          Open App →
        </button>
        <a
          href="#how"
          className="border border-border px-8 py-3.5 rounded-full text-[15px] font-medium hover:border-fg transition-all"
        >
          How it works
        </a>
      </div>
    </section>
  )
}

export default function Hero({ onOpenApp }) {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 relative overflow-hidden">
      <div className="relative z-10">
        {/* Status badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-stripe-border rounded text-[12px] font-medium text-stripe-body mb-10"
          style={{ boxShadow: '0 2px 8px rgba(50,50,93,0.1)' }}
        >
          <span className="w-1.5 h-1.5 bg-stripe-success rounded-full animate-pulse" />
          Live on Arc Testnet
        </div>

        {/* Headline */}
        <h1
          className="text-[clamp(44px,8vw,72px)] font-light leading-[1.03] max-w-[700px] mx-auto mb-6 text-stripe-navy"
          style={{ letterSpacing: '-1.4px', fontFeatureSettings: '"ss01"' }}
        >
          Trust, automated.
        </h1>

        <p className="text-[18px] font-light text-stripe-body max-w-[460px] mx-auto leading-[1.4] mb-12">
          Trustless escrow for strangers. No middleman, no fees, no trust needed. Just a $0.01 smart contract on Arc.
        </p>

        {/* CTAs */}
        <div className="flex gap-3 justify-center">
          <button onClick={onOpenApp} className="btn-primary flex items-center gap-2 px-8 py-3 text-[15px]">
            Open App
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7H13M13 7L7 1M13 7L7 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <a href="#how" className="btn-ghost">How it works</a>
        </div>

        {/* Mock UI Preview — heavy 3D shadow */}
        <div className="mt-20 max-w-[640px] mx-auto card-heavy overflow-hidden">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-5 py-3 bg-stripe-surface border-b border-stripe-border">
            <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
            <div className="ml-4 flex-1 h-5 bg-stripe-border/60 rounded text-[10px] font-mono text-stripe-body flex items-center px-3">
              bond.app/deal/42
            </div>
          </div>
          {/* Mock deal content */}
          <div className="p-6 text-left">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-stripe-navy flex items-center justify-center" style={{ boxShadow: '0 2px 8px rgba(6,27,49,0.3)' }}>
                  <span className="text-white text-[10px] font-bold font-mono">B</span>
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-stripe-navy">Deal #42</div>
                  <div className="text-[12px] text-stripe-body">Landing page redesign</div>
                </div>
              </div>
              <span className="badge-success">Active</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Amount', value: '500 USDC' },
                { label: 'Fee', value: '$0.01' },
                { label: 'Finality', value: '< 1s' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-stripe-surface border border-stripe-border rounded p-3"
                  style={{ boxShadow: '0 2px 6px rgba(50,50,93,0.06)' }}
                >
                  <div className="text-[10px] font-mono uppercase tracking-wider text-stripe-body mb-1">{item.label}</div>
                  <div className="text-[18px] font-semibold text-stripe-navy" style={{ fontFeatureSettings: '"tnum"' }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-stripe-navy text-white text-center py-2.5 rounded text-[13px] font-medium" style={{ boxShadow: '0 2px 8px rgba(6,27,49,0.3)' }}>Release</div>
              <div className="flex-1 bg-white border border-stripe-border text-stripe-body text-center py-2.5 rounded text-[13px] font-medium" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>Refund</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

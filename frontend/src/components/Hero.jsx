export default function Hero({ onOpenApp }) {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 relative overflow-hidden">
      {/* Subtle ambient shadow behind hero */}
      <div
        className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full pointer-events-none opacity-40"
        style={{ background: 'radial-gradient(ellipse, rgba(50,50,93,0.06) 0%, transparent 70%)' }}
      />

      <div className="relative z-10">
        {/* Status badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-stripe-border rounded text-[12px] font-medium text-stripe-body mb-10"
          style={{ boxShadow: 'rgba(23,23,23,0.06) 0px 3px 6px' }}
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

        {/* Mock UI Preview */}
        <div
          className="mt-16 max-w-[640px] mx-auto bg-white border border-stripe-border rounded-lg overflow-hidden"
          style={{ boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px' }}
        >
          {/* Mock app bar */}
          <div className="flex items-center gap-2 px-5 py-3 bg-stripe-surface border-b border-stripe-border">
            <div className="w-2.5 h-2.5 rounded-full bg-stripe-border" />
            <div className="w-2.5 h-2.5 rounded-full bg-stripe-border" />
            <div className="w-2.5 h-2.5 rounded-full bg-stripe-border" />
            <div className="ml-4 flex-1 h-5 bg-stripe-border/50 rounded" />
          </div>
          {/* Mock content */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-stripe-navy flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold font-mono">B</span>
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-stripe-navy">Deal #42</div>
                  <div className="text-[12px] text-stripe-body">Landing page redesign</div>
                </div>
              </div>
              <span className="badge-success">Active</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-stripe-surface border border-stripe-border rounded p-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-stripe-body mb-1">Amount</div>
                <div className="text-[18px] font-semibold text-stripe-navy" style={{ fontFeatureSettings: '"tnum"' }}>500 USDC</div>
              </div>
              <div className="bg-stripe-surface border border-stripe-border rounded p-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-stripe-body mb-1">Fee</div>
                <div className="text-[18px] font-semibold text-stripe-navy" style={{ fontFeatureSettings: '"tnum"' }}>$0.01</div>
              </div>
              <div className="bg-stripe-surface border border-stripe-border rounded p-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-stripe-body mb-1">Finality</div>
                <div className="text-[18px] font-semibold text-stripe-navy" style={{ fontFeatureSettings: '"tnum"' }}>{'< 1s'}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-stripe-navy text-white text-center py-2 rounded text-[13px] font-medium">Release</div>
              <div className="flex-1 bg-white border border-stripe-border text-stripe-body text-center py-2 rounded text-[13px] font-medium">Refund</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

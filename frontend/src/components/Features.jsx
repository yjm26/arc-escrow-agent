const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 3v14M7 6l3-3 3 3" stroke="#061b31" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="10" cy="13" r="2.5" stroke="#061b31" strokeWidth="1.5"/>
      </svg>
    ),
    label: 'Cost per tx',
    value: '$0.01',
    desc: 'Stable fees in USDC',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="#061b31" strokeWidth="1.5"/>
        <path d="M10 6v4l2.5 1.5" stroke="#061b31" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    label: 'Finality',
    value: '< 1s',
    desc: 'Deterministic settlement',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="4" y="4" width="12" height="12" rx="2" stroke="#061b31" strokeWidth="1.5"/>
        <path d="M7 10h6" stroke="#061b31" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    label: 'Middleman',
    value: '0',
    desc: 'Smart contract holds funds',
  },
]

export default function Features() {
  return (
    <section className="py-32 px-10">
      <div className="max-w-[960px] mx-auto">
        <div className="font-mono text-[11px] uppercase tracking-[3px] text-stripe-body mb-4">
          Why BOND
        </div>
        <h2
          className="text-[32px] font-light text-stripe-navy mb-14"
          style={{ letterSpacing: '-0.64px', fontFeatureSettings: '"ss01"' }}
        >
          Built on Arc. Priced for everyone.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.label} className="card-3d p-7">
              <div className="w-11 h-11 rounded bg-stripe-surface border border-stripe-border flex items-center justify-center mb-5" style={{ boxShadow: '0 2px 6px rgba(50,50,93,0.08)' }}>
                {f.icon}
              </div>
              <div className="font-mono text-[11px] uppercase tracking-[2px] text-stripe-body mb-2">
                {f.label}
              </div>
              <div
                className="text-[36px] font-light text-stripe-navy mb-1"
                style={{ letterSpacing: '-0.96px', fontFeatureSettings: '"tnum"' }}
              >
                {f.value}
              </div>
              <div className="text-[14px] font-light text-stripe-body">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

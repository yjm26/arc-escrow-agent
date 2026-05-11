const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2v16M6 6l4-4 4 4" stroke="#533afd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="10" cy="12" r="3" stroke="#533afd" strokeWidth="1.5"/>
      </svg>
    ),
    label: 'Cost per tx',
    value: '$0.01',
    desc: 'Stable fees in USDC',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 10a7 7 0 1 1 14 0 7 7 0 0 1-14 0z" stroke="#533afd" strokeWidth="1.5"/>
        <path d="M10 6v4l2.5 1.5" stroke="#533afd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    label: 'Finality',
    value: '< 1s',
    desc: 'Deterministic settlement',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="14" height="14" rx="2" stroke="#533afd" strokeWidth="1.5"/>
        <path d="M7 10h6M10 7v6" stroke="#533afd" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    label: 'Middleman',
    value: '0',
    desc: 'Smart contract holds funds',
  },
]

export default function Features() {
  return (
    <section className="py-20 px-10">
      <div className="max-w-[960px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={f.label}
              className="bg-white border border-stripe-border rounded-lg p-6 transition-all hover:-translate-y-1"
              style={{
                boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px',
              }}
            >
              <div className="w-10 h-10 rounded bg-stripe-surface border border-stripe-border flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <div className="font-mono text-[11px] uppercase tracking-[2px] text-stripe-body mb-2">
                {f.label}
              </div>
              <div
                className="text-[32px] font-light text-stripe-navy mb-1"
                style={{ letterSpacing: '-0.64px', fontFeatureSettings: '"tnum"' }}
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

const FEATURES = [
  { label: 'Cost per tx', value: '$0.01', desc: 'Stable fees in USDC' },
  { label: 'Finality', value: '< 1s', desc: 'Deterministic settlement' },
  { label: 'Middleman', value: '0', desc: 'Smart contract holds funds' },
]

export default function Features() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 border-y border-border">
      {FEATURES.map((f) => (
        <div
          key={f.label}
          className="p-10 border-r border-border last:border-r-0 hover:bg-[#f5f5f3] transition-colors"
        >
          <div className="font-mono text-[11px] uppercase tracking-[2px] text-muted mb-3">
            {f.label}
          </div>
          <div className="text-[32px] font-bold tracking-tight">{f.value}</div>
          <div className="text-sm text-muted mt-2">{f.desc}</div>
        </div>
      ))}
    </div>
  )
}

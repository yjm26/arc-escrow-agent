const STEPS = [
  {
    num: '01',
    title: 'Create a deal',
    desc: 'Set the freelancer address, USDC amount, and what needs to be delivered.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Fund the escrow',
    desc: 'Approve and deposit USDC into the contract. Funds are locked until you release or refund.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M4 10h16" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="16" cy="14" r="1.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Work gets done',
    desc: 'Freelancer does the work. No pressure, no "pay me first" drama.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    num: '04',
    title: 'Release or refund',
    desc: 'Satisfied? Release USDC to the freelancer. Not happy? Refund yourself. Instant.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M4 12h16M16 8l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

export default function HowItWorks() {
  return (
    <section id="how" className="py-32 px-10 bg-stripe-brand-dark">
      <div className="max-w-[960px] mx-auto">
        <div className="font-mono text-[11px] uppercase tracking-[3px] text-white/40 mb-4">
          How it works
        </div>
        <h2
          className="text-[36px] font-light text-white mb-16 max-w-[500px]"
          style={{ letterSpacing: '-0.64px', fontFeatureSettings: '"ss01"' }}
        >
          Four steps. Zero trust.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className="bg-white/[0.07] border border-white/[0.12] rounded-lg p-6 transition-all hover:bg-white/[0.1] hover:-translate-y-1"
              style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.2), 0 16px 40px rgba(0,0,0,0.15)' }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded bg-white/[0.12] border border-white/[0.15] flex items-center justify-center text-white/70" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                  {s.icon}
                </div>
                <span className="font-mono text-[11px] text-white/30 tracking-wider" style={{ fontFeatureSettings: '"tnum"' }}>
                  {s.num}
                </span>
              </div>
              <h4
                className="text-[18px] font-light text-white mb-2"
                style={{ letterSpacing: '-0.22px' }}
              >
                {s.title}
              </h4>
              <p className="text-[14px] font-light text-white/50 leading-[1.5]">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

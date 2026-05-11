const STEPS = [
  { num: '01', title: 'Create a deal', desc: 'Set the freelancer address, USDC amount, and what needs to be delivered.' },
  { num: '02', title: 'Fund the escrow', desc: 'Approve and deposit USDC into the contract. Funds are locked until you release or refund.' },
  { num: '03', title: 'Work gets done', desc: 'Freelancer does the work. No pressure, no "pay me first" drama.' },
  { num: '04', title: 'Release or refund', desc: 'Satisfied? Release USDC to the freelancer. Not happy? Refund yourself. Instant.' },
]

export default function HowItWorks() {
  return (
    <section id="how" className="py-25 px-10 max-w-[900px] mx-auto">
      <div className="font-mono text-[11px] uppercase tracking-[3px] text-muted mb-4">
        How it works
      </div>
      <h2 className="text-[36px] font-bold tracking-tight mb-12 max-w-[500px]">
        Four steps. Zero trust.
      </h2>

      <div className="flex flex-col">
        {STEPS.map((s) => (
          <div key={s.num} className="flex gap-6 py-8 border-b border-border last:border-b-0">
            <span className="font-mono text-sm text-muted min-w-[24px] pt-0.5">{s.num}</span>
            <div>
              <h4 className="text-lg font-semibold mb-1.5">{s.title}</h4>
              <p className="text-sm text-muted leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

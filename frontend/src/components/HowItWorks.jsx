const STEPS = [
  {
    num: '01',
    title: 'Create a room',
    desc: 'Set what you\'re selling, the price in USDC. Get a unique invite code — only your counterparty can join.',
  },
  {
    num: '02',
    title: 'Fund escrow',
    desc: 'Buyer deposits USDC into the smart contract. 1% fee only. Funds locked until release or dispute.',
  },
  {
    num: '03',
    title: 'Item given & confirm',
    desc: 'Seller marks item as given. Buyer confirms receipt — or disputes. 2h auto-release if no action.',
  },
  {
    num: '04',
    title: 'Settled',
    desc: 'Funds released to seller. If disputed, arbiter decides. 6h timeout if arbiter is absent.',
  },
]

const STATS = [
  { label: 'Cost per tx', value: '$0.01', desc: 'Stable fees in USDC' },
  { label: 'Finality', value: '< 1s', desc: 'Deterministic settlement' },
  { label: 'Middleman', value: '0', desc: 'Smart contract holds funds' },
]

export default function HowItWorks() {
  return (
    <section id="how" className="py-24 px-10 border-t border-stripe-border dark:border-white/10">
      <div className="max-w-[960px] mx-auto">
        {/* Header + Steps side by side */}
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-12 mb-20">
          {/* Left — title */}
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[3px] text-stripe-body dark:text-gray-500 mb-4">
              How it works
            </div>
            <h2
              className="text-[32px] font-light text-stripe-navy dark:text-white"
              style={{ letterSpacing: '-0.64px', fontFeatureSettings: '"ss01"' }}
            >
              Four steps.
              <br />
              Zero trust.
            </h2>
          </div>

          {/* Right — steps */}
          <div>
            {STEPS.map((s, i) => (
              <div key={s.num} className={`py-4 ${i > 0 ? 'border-t border-stripe-border dark:border-white/10' : ''}`}>
                <div className="flex gap-4">
                  <span
                    className="font-mono text-[12px] text-stripe-body dark:text-gray-500 pt-0.5 shrink-0"
                    style={{ fontFeatureSettings: '"tnum"', width: '18px' }}
                  >
                    {s.num}
                  </span>
                  <div>
                    <h4 className="text-[15px] font-medium text-stripe-navy dark:text-white mb-0.5">
                      {s.title}
                    </h4>
                    <p className="text-[13px] font-light text-stripe-body dark:text-gray-400 leading-[1.6]">
                      {s.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why BOND — 3 stat cards */}
        <div className="border-t border-stripe-border dark:border-white/10 pt-16">
          <div className="font-mono text-[11px] uppercase tracking-[3px] text-stripe-body dark:text-gray-500 mb-4">
            Why BOND
          </div>
          <h2
            className="text-[28px] font-light text-stripe-navy dark:text-white mb-10"
            style={{ letterSpacing: '-0.56px' }}
          >
            Built on Arc. Priced for everyone.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="border border-stripe-border dark:border-white/10 rounded-md overflow-hidden">
                <div className="h-[2px] bg-teal-500" />
                <div className="p-6">
                  <div className="font-mono text-[11px] uppercase tracking-[2px] text-stripe-body dark:text-gray-500 mb-2">
                    {s.label}
                  </div>
                  <div
                    className="text-[36px] font-light text-stripe-navy dark:text-white mb-1"
                    style={{ letterSpacing: '-0.96px', fontFeatureSettings: '"tnum"' }}
                  >
                    {s.value}
                  </div>
                  <div className="text-[13px] font-light text-stripe-body dark:text-gray-400">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="border-t border-stripe-border dark:border-white/10 pt-16 mt-16">
          <div className="font-mono text-[11px] uppercase tracking-[3px] text-stripe-body dark:text-gray-500 mb-4">
            FAQ
          </div>
          <h2
            className="text-[28px] font-light text-stripe-navy dark:text-white mb-10"
            style={{ letterSpacing: '-0.56px' }}
          >
            Common questions
          </h2>

          <div className="space-y-0">
            <FaqItem q="What happens if the seller doesn't deliver?" a="If the seller misses the delivery deadline, the buyer can call a refund and get their USDC back plus collateral. The 1% platform fee is not refunded." />
            <FaqItem q="What if I receive a damaged or wrong item?" a="After the seller marks the item as delivered, you have 3 days to dispute. An arbiter will review and decide — full refund, release to seller, or 50/50 split." />
            <FaqItem q="Who is the arbiter?" a="The deployer wallet acts as arbiter. For testnet this is a single address. On mainnet, this should be a multi-sig or governance contract." />
            <FaqItem q="What if the arbiter never responds?" a="Disputes have no automatic timeout. Funds stay frozen until the arbiter acts. This prevents griefers from exploiting timers, but it also means disputes require patience. The arbiter typically responds within 24 hours." />
            <FaqItem q="Is the contract verified?" a="Yes. The source code is on GitHub and the contract is deployed on Arc Testnet. You can verify it on the block explorer." />
            <FaqItem q="What are the timers?" a="Join: 1 day, Fund: 1 day, Delivery: 1–90 days (set at creation), Auto-release after delivery: 3 days, Dispute: no timeout. All enforced by the smart contract." />
          </div>
        </div>
      </div>
    </section>
  )
}

function FaqItem({ q, a }) {
  return (
    <div className="py-5 border-t border-stripe-border dark:border-white/10">
      <h4 className="text-[15px] font-medium text-stripe-navy dark:text-white mb-1.5">{q}</h4>
      <p className="text-[14px] font-light text-stripe-body dark:text-gray-400 leading-[1.6]">{a}</p>
    </div>
  )
}

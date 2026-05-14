import { Link } from 'react-router-dom'

const TRUST_SIGNALS = [
  { icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  ), label: 'Non-custodial' },
  { icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6"/><path d="M8 6l-6 6 6 6"/></svg>
  ), label: 'Open source' },
  { icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path d="M9 12l2 2 4-4"/></svg>
  ), label: 'Audited logic' },
  { icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
  ), label: '1% flat fee' },
]

const STEPS = [
  { n: '01', title: 'Create', desc: 'Set price, collateral, and delivery window.' },
  { n: '02', title: 'Fund', desc: 'Buyer locks USDC into the smart contract.' },
  { n: '03', title: 'Release', desc: 'Funds unlock only when both parties agree.' },
]

export default function Hero({ wallet, onConnect }) {
  return (
    <section className="relative pt-28 pb-24 px-4 sm:px-6 overflow-hidden">
      {/* Subtle background — single blob, very faint */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[0.03] blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(10,37,64,1), transparent 70%)' }} />
      </div>

      <div className="relative z-10 max-w-[1100px] mx-auto">
        {/* ── Top: Trust bar ── */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          {TRUST_SIGNALS.map((t, i) => (
            <div key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-stripe-border dark:border-white/10 bg-white dark:bg-white/5 text-[11px] text-stripe-body dark:text-gray-400">
              <span className="text-stripe-navy dark:text-gray-300">{t.icon}</span>
              <span className="font-medium">{t.label}</span>
            </div>
          ))}
        </div>

        {/* ── Center: Headline ── */}
        <div className="text-center max-w-[640px] mx-auto mb-12">
          <h1
            className="text-[clamp(36px,6vw,64px)] font-medium leading-[1.05] mb-5 text-stripe-navy dark:text-white"
            style={{ letterSpacing: '-1.2px' }}
          >
            Every deal.<br />Fully protected.
          </h1>
          <p className="text-[16px] sm:text-[17px] font-light text-stripe-body dark:text-gray-400 leading-[1.55] max-w-[480px] mx-auto">
            Lock USDC in an immutable smart contract. Funds release only when both parties confirm — or an on-chain arbiter resolves the dispute. No one holds your money. Not even us.
          </p>
        </div>

        {/* ── CTAs ── */}
        <div className="flex gap-3 justify-center mb-14">
          <Link to="/market" className="btn-primary flex items-center gap-2 px-7 py-3 text-[15px]">
            Browse Market
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7H13M13 7L7 1M13 7L7 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          {!wallet && (
            <button onClick={onConnect} className="btn-ghost px-6 py-3 text-[15px]">Connect Wallet</button>
          )}
        </div>

        {/* ── Bottom: Steps + Preview ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left — Step cards */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {STEPS.map((s) => (
              <div key={s.n} className="card-3d p-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-md bg-stripe-navy dark:bg-white flex items-center justify-center shrink-0">
                  <span className="text-white dark:text-[#0c0f1a] text-[10px] font-bold font-mono">{s.n}</span>
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-stripe-navy dark:text-white">{s.title}</div>
                  <div className="text-[13px] text-stripe-body dark:text-gray-400 mt-0.5">{s.desc}</div>
                </div>
              </div>
            ))}

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 mt-2">
              {[
                { val: '$0.01', label: 'Min tx' },
                { val: '1%', label: 'Fee' },
                { val: '<1s', label: 'Finality' },
                { val: '0', label: 'Custody' },
              ].map(s => (
                <div key={s.label} className="text-center p-3 rounded-lg border border-stripe-border dark:border-white/10 bg-white dark:bg-white/5">
                  <div className="text-[16px] font-semibold text-stripe-navy dark:text-white font-mono leading-none tracking-tight">{s.val}</div>
                  <div className="text-[9px] text-stripe-body dark:text-gray-500 uppercase tracking-wider mt-1.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Live preview card */}
          <div className="lg:col-span-7">
            <div className="card-3d overflow-hidden">
              {/* Chrome bar */}
              <div className="flex items-center gap-2 px-5 py-3 bg-stripe-surface dark:bg-white/5 border-b border-stripe-border dark:border-white/10">
                <div className="w-2.5 h-2.5 rounded-full bg-red-300/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-300/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-300/80" />
                <div className="ml-4 flex-1 h-5 bg-white dark:bg-white/5 border border-stripe-border dark:border-white/10 rounded text-[10px] font-mono text-stripe-body dark:text-gray-500 flex items-center px-3">
                  bond.app/room/42
                </div>
                <div className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                  <span className="w-1 h-1 rounded-full bg-green-500" />
                  Verified
                </div>
              </div>

              <div className="p-5 text-left">
                {/* Room header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-stripe-navy dark:bg-white flex items-center justify-center">
                      <span className="text-white dark:text-[#0c0f1a] text-[10px] font-bold font-mono">B</span>
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold text-stripe-navy dark:text-white">Room #42</div>
                      <div className="text-[12px] text-stripe-body dark:text-gray-500">Landing page redesign</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[10px] font-semibold tracking-wider text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                    FUNDED
                  </span>
                </div>

                {/* Breakdown */}
                <div className="border border-stripe-border dark:border-white/10 rounded-md mb-4">
                  {[
                    { label: 'Item price', value: '500.0 USDC' },
                    { label: 'Platform fee (1%)', value: '5.0 USDC' },
                    { label: 'Total escrowed', value: '505.0 USDC', bold: true },
                  ].map((item, i) => (
                    <div key={item.label} className={`flex justify-between text-[13px] px-4 py-2.5 ${i < 2 ? 'border-b border-stripe-border dark:border-white/10' : ''} ${item.bold ? 'font-medium' : ''}`}>
                      <span className="text-stripe-body dark:text-gray-500">{item.label}</span>
                      <span className="text-stripe-navy dark:text-gray-200 font-mono">{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Parties */}
                <div className="border border-stripe-border dark:border-white/10 rounded-md mb-4">
                  <div className="px-4 py-2 border-b border-stripe-border dark:border-white/10">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-stripe-body dark:text-gray-500">Parties</span>
                  </div>
                  {[
                    { addr: '0xF871…7AF3', role: 'Seller', you: true },
                    { addr: '0xAb12…9c34', role: 'Buyer', you: false },
                  ].map((p, i) => (
                    <div key={i} className={`flex justify-between items-center px-4 py-2.5 ${i === 0 ? 'border-b border-stripe-border dark:border-white/10' : ''}`}>
                      <div>
                        <span className="text-[13px] text-stripe-navy dark:text-gray-200 font-mono">{p.addr}</span>
                        {p.you && <span className="ml-2 text-[10px] text-purple-600 dark:text-purple-400 font-medium">(you)</span>}
                      </div>
                      <span className="text-[12px] text-stripe-body dark:text-gray-500">{p.role}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <div className="flex-1 bg-stripe-navy dark:bg-white text-white dark:text-[#0c0f1a] text-center py-2.5 rounded-md text-[13px] font-medium">Release Funds</div>
                  <div className="flex-1 bg-transparent border border-stripe-border dark:border-white/10 text-stripe-body dark:text-gray-400 text-center py-2.5 rounded-md text-[13px] font-medium">Open Dispute</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

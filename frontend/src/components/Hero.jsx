import { Link } from 'react-router-dom'

export default function Hero({ wallet, onConnect }) {
  return (
    <section className="pt-28 pb-20 px-4 sm:px-6">
      <div className="max-w-[1100px] mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        {/* Left — Text */}
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-white/5 border border-stripe-border dark:border-white/10 rounded-md text-[12px] font-medium text-stripe-body dark:text-gray-400 mb-8">
            <span className="w-1.5 h-1.5 bg-stripe-success rounded-full animate-pulse" />
            Live on Arc Testnet
          </div>

          <h1
            className="text-[clamp(48px,7vw,80px)] font-light leading-[1.02] mb-5 text-stripe-navy dark:text-white"
            style={{ letterSpacing: '-1.6px', fontFeatureSettings: '"ss01"' }}
          >
            Trust,<br />automated.
          </h1>

          <p className="text-[17px] font-light text-stripe-body dark:text-gray-400 leading-[1.5] mb-10 max-w-[400px] mx-auto lg:mx-0">
            Trustless escrow for strangers. No middleman, no trust needed. Just a smart contract on Arc.
          </p>

          <div className="flex gap-3 justify-center lg:justify-start">
            <Link to="/market" className="btn-primary flex items-center gap-2 px-7 py-3 text-[15px]">
              Browse Market
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 7H13M13 7L7 1M13 7L7 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            {!wallet && (
              <button onClick={onConnect} className="btn-ghost px-5 py-3 text-[15px]">Connect Wallet</button>
            )}
          </div>
        </div>

        {/* Right — Preview Card */}
        <div className="flex-1 max-w-[480px] w-full">
          <div className="card-3d overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-5 py-3 bg-stripe-surface dark:bg-white/5 border-b border-stripe-border dark:border-white/10">
              <div className="w-2.5 h-2.5 rounded-full bg-red-300/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-300/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-300/80" />
              <div className="ml-4 flex-1 h-5 bg-white dark:bg-white/5 border border-stripe-border dark:border-white/10 rounded text-[10px] font-mono text-stripe-body dark:text-gray-500 flex items-center px-3">
                bond.app/room/42
              </div>
            </div>

            {/* Deal content */}
            <div className="p-5 text-left">
              <div className="flex items-center justify-between mb-4">
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

              {/* Price breakdown */}
              <div className="border border-stripe-border dark:border-white/10 rounded-md mb-4">
                {[
                  { label: 'Item price', value: '500.0 USDC' },
                  { label: 'Tax (1%)', value: '5.0 USDC' },
                  { label: 'Total in escrow', value: '505.0 USDC', bold: true },
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
                <div className="flex-1 bg-stripe-navy dark:bg-white text-white dark:text-[#0c0f1a] text-center py-2.5 rounded-md text-[13px] font-medium">Release</div>
                <div className="flex-1 bg-transparent border border-stripe-border dark:border-white/10 text-stripe-body dark:text-gray-400 text-center py-2.5 rounded-md text-[13px] font-medium">Dispute</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

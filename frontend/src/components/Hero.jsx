import { Link } from 'react-router-dom'

export default function Hero({ wallet, onConnect }) {
  return (
    <section className="relative pt-28 pb-20 px-4 sm:px-6 overflow-hidden">
      {/* Subtle gradient blobs — behind content, very low opacity */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full opacity-[0.06] blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(83,58,253,1), transparent 70%)', animation: 'float 18s ease-in-out infinite' }} />
        <div className="absolute top-1/3 -left-20 w-[400px] h-[400px] rounded-full opacity-[0.04] blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,1), transparent 70%)', animation: 'float 22s ease-in-out infinite 6s' }} />
        <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] rounded-full opacity-[0.04] blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,1), transparent 70%)', animation: 'float 20s ease-in-out infinite 12s' }} />
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -20px) scale(1.03); }
          66% { transform: translate(-15px, 15px) scale(0.97); }
        }
      `}</style>

      <div className="relative z-10 max-w-[1100px] mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
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

          {/* Stats row */}
          <div className="flex gap-8 mt-10 justify-center lg:justify-start">
            {[
              { val: '$0.01', label: 'Per tx' },
              { val: '1%', label: 'Fee only' },
              { val: '<1s', label: 'Finality' },
              { val: '0', label: 'Middleman' },
            ].map(s => (
              <div key={s.label} className="text-center lg:text-left">
                <div className="text-[20px] font-semibold text-stripe-navy dark:text-white font-mono leading-none tracking-tight">{s.val}</div>
                <div className="text-[10px] text-stripe-body dark:text-gray-500 uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
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
                  { label: 'Fee (1%)', value: '5.0 USDC' },
                  { label: 'Total to fund', value: '505.0 USDC', bold: true },
                ].map((item, i) => (
                  <div key={item.label} className={`flex justify-between text-[13px] px-4 py-2.5 ${i < 2 ? 'border-b border-stripe-border dark:border-white/10' : ''} ${item.bold ? 'font-medium' : ''}`}>
                    <span className="text-stripe-body dark:text-gray-500">{item.label}</span>
                    <span className="text-stripe-navy dark:text-gray-200 font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-stripe-body dark:text-gray-500 text-center mt-2">
                Escrow: 500.0 USDC | Fee to treasury: 5.0 USDC
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

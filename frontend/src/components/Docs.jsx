import { useParams, Link } from 'react-router-dom'

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'market', label: 'Market' },
  { id: 'collateral', label: 'Collateral' },
  { id: 'mutual-cancel', label: 'Mutual Cancel' },
  { id: 'disputes', label: 'Disputes' },
  { id: 'timers', label: 'Timers & Deadlines' },
  { id: 'fees', label: 'Fees' },
  { id: 'security', label: 'Security' },
  { id: 'faq', label: 'FAQ' },
]

export default function Docs() {
  const { section } = useParams()
  const active = section || 'overview'

  return (
    <section className="pt-24 pb-32 px-4 sm:px-6 min-h-screen">
      <div className="max-w-[900px] mx-auto">

        {/* Mobile section nav. sticky, full bleed, scrollable */}
        <div className="md:hidden sticky top-[60px] z-30 bg-[#faf9f7]/95 dark:bg-[#0c0f1a]/95 backdrop-blur-xl -mx-4 px-4 py-2 border-b border-stripe-border dark:border-white/10 mb-6">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {SECTIONS.map((s) => (
              <Link
                key={s.id}
                to={`/docs/${s.id}`}
                className={`shrink-0 text-[12px] px-3 py-1.5 rounded-full whitespace-nowrap no-underline border transition ${
                  active === s.id
                    ? 'bg-stripe-navy text-white border-stripe-navy'
                    : 'text-stripe-body dark:text-gray-400 border-stripe-border dark:border-white/10 hover:border-stripe-navy'
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar. desktop only */}
          <nav className="hidden md:block w-[180px] shrink-0 pt-2">
            <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-4">Docs</div>
            <div className="flex flex-col gap-1">
              {SECTIONS.map((s) => (
                <Link
                  key={s.id}
                  to={`/docs/${s.id}`}
                  className={`text-[13px] px-3 py-1.5 rounded transition no-underline ${
                    active === s.id
                      ? 'bg-stripe-navy text-white font-medium'
                      : 'text-stripe-body dark:text-gray-400 hover:text-stripe-navy dark:hover:text-white hover:bg-stripe-surface dark:hover:bg-white/5'
                  }`}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0 md:pt-2">
            {active === 'overview' && <Overview />}
            {active === 'how-it-works' && <HowItWorks />}
            {active === 'market' && <MarketDoc />}
            {active === 'collateral' && <Collateral />}
            {active === 'mutual-cancel' && <MutualCancel />}
            {active === 'disputes' && <Disputes />}
            {active === 'timers' && <Timers />}
            {active === 'fees' && <Fees />}
            {active === 'security' && <Security />}
            {active === 'faq' && <FAQ />}
          </div>
        </div>
      </div>
    </section>
  )
}

function H1({ children }) {
  return <h1 className="text-[24px] md:text-[28px] font-light text-stripe-navy dark:text-white mb-2" style={{ letterSpacing: '-0.56px' }}>{children}</h1>
}

function H2({ children }) {
  return <h2 className="text-[16px] md:text-[18px] font-semibold text-stripe-navy dark:text-white mt-8 mb-3">{children}</h2>
}

function H3({ children }) {
  return <h3 className="text-[14px] md:text-[15px] font-semibold text-stripe-navy dark:text-white mt-6 mb-2">{children}</h3>
}

function P({ children }) {
  return <p className="text-[14px] text-stripe-body dark:text-gray-400 leading-[1.7] mb-4">{children}</p>
}

function Code({ children }) {
  return <code className="bg-stripe-surface dark:bg-white/5 border border-stripe-border dark:border-white/10 rounded px-1.5 py-0.5 text-[13px] font-mono text-stripe-navy dark:text-white">{children}</code>
}

function Table({ headers, rows }) {
  return (
    <div className="border border-stripe-border dark:border-white/10 rounded-lg overflow-hidden mb-6">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-stripe-surface dark:bg-white/5">
            {headers.map((h, i) => (
              <th key={i} className="text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-stripe-border dark:border-white/10">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-stripe-navy dark:text-white">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Badge({ children, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    green: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
    red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
    slate: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
  }
  return <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider border ${colors[color]}`}>{children}</span>
}

function InfoBox({ title, children, color = 'blue' }) {
  const bgColors = {
    blue: 'bg-blue-50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/15',
    amber: 'bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/15',
    green: 'bg-green-50 dark:bg-green-500/5 border-green-200 dark:border-green-500/15',
  }
  const titleColors = {
    blue: 'text-blue-800 dark:text-blue-400',
    amber: 'text-amber-800 dark:text-amber-400',
    green: 'text-green-800 dark:text-green-400',
  }
  return (
    <div className={`${bgColors[color]} border rounded-lg p-4 mb-6`}>
      <div className={`text-[13px] font-medium mb-1 ${titleColors[color]}`}>{title}</div>
      <div className={`text-[12px] leading-[1.6] ${color === 'blue' ? 'text-blue-700 dark:text-blue-300' : color === 'amber' ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300'}`}>
        {children}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════


function StateFlowDiagram() {
  return (
    <div className="border border-stripe-border dark:border-white/10 rounded-lg p-5 my-6 bg-stripe-surface dark:bg-white/5 overflow-x-auto">
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-4 text-center">State Machine</div>
      <svg viewBox="0 0 720 260" className="w-full min-w-[600px]" style={{ maxWidth: '720px', margin: '0 auto' }}>
        {/* Main flow */}
        <g>
          <rect x="20" y="10" width="140" height="44" rx="8" fill="#f1f5f9" stroke="#64748b" strokeWidth={1.5} />
          <text x="90" y="28" textAnchor="middle" fill="#334155" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">Created</text>
          <text x="90" y="42" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter, sans-serif">Room open, waiting</text>
        </g>
        <line x1="160" y1="32" x2="190" y2="32" stroke="#94a3b8" strokeWidth={1.5} />
        <polygon points="190,32 185,29 185,35" fill="#94a3b8" />

        <g>
          <rect x="190" y="10" width="140" height="44" rx="8" fill="#f3e8ff" stroke="#7c3aed" strokeWidth={1.5} />
          <text x="260" y="28" textAnchor="middle" fill="#5b21b6" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">Joined</text>
          <text x="260" y="42" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter, sans-serif">Buyer entered</text>
        </g>
        <line x1="330" y1="32" x2="360" y2="32" stroke="#94a3b8" strokeWidth={1.5} />
        <polygon points="360,32 355,29 355,35" fill="#94a3b8" />

        <g>
          <rect x="360" y="10" width="140" height="44" rx="8" fill="#fef3c7" stroke="#d97706" strokeWidth={1.5} />
          <text x="430" y="28" textAnchor="middle" fill="#92400e" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">Funded</text>
          <text x="430" y="42" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter, sans-serif">USDC in escrow</text>
        </g>
        <line x1="500" y1="32" x2="530" y2="32" stroke="#94a3b8" strokeWidth={1.5} />
        <polygon points="530,32 525,29 525,35" fill="#94a3b8" />

        <g>
          <rect x="530" y="10" width="140" height="44" rx="8" fill="#dcfce7" stroke="#16a34a" strokeWidth={1.5} />
          <text x="600" y="28" textAnchor="middle" fill="#14532d" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">Delivered</text>
          <text x="600" y="42" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter, sans-serif">Seller marked given</text>
        </g>

        {/* Branches from Delivered */}
        <line x1="600" y1="54" x2="600" y2="70" stroke="#94a3b8" strokeWidth={1.5} />

        {/* Confirm branch */}
        <line x1="600" y1="70" x2="140" y2="70" stroke="#94a3b8" strokeWidth={1.5} />
        <line x1="140" y1="70" x2="140" y2="90" stroke="#94a3b8" strokeWidth={1.5} />
        <polygon points="140,90 137,85 143,85" fill="#94a3b8" />
        <g>
          <rect x="70" y="90" width="140" height="44" rx="8" fill="#d1fae5" stroke="#059669" strokeWidth={1.5} />
          <text x="140" y="108" textAnchor="middle" fill="#064e3b" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">Released</text>
          <text x="140" y="122" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter, sans-serif">Funds to seller</text>
        </g>
        <text x="140" y="82" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="Inter, sans-serif">Confirm</text>

        {/* Dispute branch */}
        <line x1="600" y1="70" x2="360" y2="70" stroke="#94a3b8" strokeWidth={1.5} />
        <line x1="360" y1="70" x2="360" y2="90" stroke="#94a3b8" strokeWidth={1.5} />
        <polygon points="360,90 357,85 363,85" fill="#94a3b8" />
        <g>
          <rect x="290" y="90" width="140" height="44" rx="8" fill="#fee2e2" stroke="#dc2626" strokeWidth={1.5} />
          <text x="360" y="108" textAnchor="middle" fill="#7f1d1d" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">Disputed</text>
          <text x="360" y="122" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter, sans-serif">Frozen, arbiter</text>
        </g>
        <text x="360" y="82" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="Inter, sans-serif">Dispute</text>

        {/* Cancel branch */}
        <line x1="600" y1="70" x2="580" y2="70" stroke="#94a3b8" strokeWidth={1.5} />
        <line x1="580" y1="70" x2="580" y2="90" stroke="#94a3b8" strokeWidth={1.5} />
        <polygon points="580,90 577,85 583,85" fill="#94a3b8" />
        <g>
          <rect x="510" y="90" width="140" height="44" rx="8" fill="#fef2f2" stroke="#991b1b" strokeWidth={1.5} />
          <text x="580" y="108" textAnchor="middle" fill="#450a0a" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">Cancelled</text>
          <text x="580" y="122" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter, sans-serif">Mutual cancel</text>
        </g>
        <text x="510" y="82" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="Inter, sans-serif">Mutual Cancel</text>

        {/* Alt states row - dashed */}
        {/* Refunded */}
        <line x1="140" y1="134" x2="140" y2="150" stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 2" />
        <polygon points="140,150 137,145 143,145" fill="#94a3b8" />
        <g>
          <rect x="70" y="150" width="140" height="44" rx="8" fill="#fef3c7" stroke="#ca8a04" strokeWidth={1.5} strokeDasharray="4 2" />
          <text x="140" y="168" textAnchor="middle" fill="#78350f" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">Refunded</text>
          <text x="140" y="182" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter, sans-serif">Buyer gets money back</text>
        </g>
        <text x="140" y="142" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="Inter, sans-serif">No delivery</text>

        {/* Expired */}
        <line x1="360" y1="134" x2="360" y2="150" stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 2" />
        <polygon points="360,150 357,145 363,145" fill="#94a3b8" />
        <g>
          <rect x="290" y="150" width="140" height="44" rx="8" fill="#f3f4f6" stroke="#6b7280" strokeWidth={1.5} strokeDasharray="4 2" />
          <text x="360" y="168" textAnchor="middle" fill="#1f2937" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">Expired</text>
          <text x="360" y="182" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter, sans-serif">Deadline passed</text>
        </g>
        <text x="360" y="142" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="Inter, sans-serif">Timer runs out</text>

        {/* Mutual cancel availability note */}
        <line x1="600" y1="54" x2="600" y2="220" stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 2" />
        <line x1="600" y1="220" x2="650" y2="220" stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 2" />
        <text x="650" y="224" textAnchor="start" fill="#94a3b8" fontSize="8" fontFamily="Inter, sans-serif">Available after Join, Fund, or Deliver</text>
      </svg>
    </div>
  )
}

function MutualCancelDiagram() {
  return (
    <div className="border border-stripe-border dark:border-white/10 rounded-lg p-5 my-6 bg-stripe-surface dark:bg-white/5 overflow-x-auto">
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-4 text-center">Mutual Cancel Flow</div>
      <svg viewBox="0 0 500 220" className="w-full" style={{ maxWidth: '500px', margin: '0 auto' }}>
        {/* Step 1 */}
        <rect x="180" y="10" width="140" height="44" rx="8" fill="#f1f5f9" stroke="#64748b" strokeWidth={1.5} />
        <text x="250" y="30" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="600" fontFamily="Inter, sans-serif">1. Request</text>
        <text x="250" y="44" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter, sans-serif">Either party clicks</text>
        
        {/* Arrow down */}
        <line x1="250" y1="54" x2="250" y2="74" stroke="#94a3b8" strokeWidth={1.5} />
        <polygon points="250,74 247,69 253,69" fill="#94a3b8" />
        
        {/* Step 2 */}
        <rect x="180" y="74" width="140" height="44" rx="8" fill="#f1f5f9" stroke="#7c3aed" strokeWidth={1.5} />
        <text x="250" y="94" textAnchor="middle" fill="#7c3aed" fontSize="12" fontWeight="600" fontFamily="Inter, sans-serif">2. Approve</text>
        <text x="250" y="108" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter, sans-serif">Other party clicks</text>
        
        {/* Arrow down */}
        <line x1="250" y1="118" x2="250" y2="138" stroke="#94a3b8" strokeWidth={1.5} />
        <polygon points="250,138 247,133 253,133" fill="#94a3b8" />
        
        {/* Step 3 */}
        <rect x="180" y="138" width="140" height="44" rx="8" fill="#dcfce7" stroke="#16a34a" strokeWidth={1.5} />
        <text x="250" y="158" textAnchor="middle" fill="#16a34a" fontSize="12" fontWeight="600" fontFamily="Inter, sans-serif">3. Execute</text>
        <text x="250" y="172" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter, sans-serif">Anyone clicks, done</text>
        
        {/* Revoke loop */}
        <path d="M 330 96 Q 400 96 400 50 Q 400 10 330 10" fill="none" stroke="#dc2626" strokeWidth={1} strokeDasharray="4 3" />
        <polygon points="330,10 335,13 335,7" fill="#dc2626" />
        <text x="400" y="55" textAnchor="middle" fill="#dc2626" fontSize="8" fontFamily="Inter, sans-serif">Revoke anytime</text>
        <text x="400" y="65" textAnchor="middle" fill="#dc2626" fontSize="8" fontFamily="Inter, sans-serif">before execute</text>
        
        {/* Status indicators */}
        <circle cx="160" cy="96" r="4" fill="#d1d5db" />
        <text x="150" y="99" textAnchor="end" fill="#9ca3af" fontSize="8" fontFamily="Inter, sans-serif">0/2</text>
        
        <circle cx="160" cy="138" r="4" fill="#f59e0b" />
        <text x="150" y="141" textAnchor="end" fill="#f59e0b" fontSize="8" fontFamily="Inter, sans-serif">1/2</text>
        
        <circle cx="340" cy="138" r="4" fill="#16a34a" />
        <text x="355" y="141" textAnchor="start" fill="#16a34a" fontSize="8" fontFamily="Inter, sans-serif">2/2 ready</text>
      </svg>
    </div>
  )
}

function CollateralDiagram() {
  return (
    <div className="border border-stripe-border dark:border-white/10 rounded-lg p-5 my-6 bg-stripe-surface dark:bg-white/5 overflow-x-auto">
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-4 text-center">What Happens to the Money</div>
      <svg viewBox="0 0 560 200" className="w-full min-w-[500px]" style={{ maxWidth: '560px', margin: '0 auto' }}>
        {/* Seller box */}
        <rect x="20" y="20" width="140" height="50" rx="8" fill="#e0e7ff" stroke="#4f46e5" strokeWidth={1.5} />
        <text x="90" y="40" textAnchor="middle" fill="#4338ca" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">Seller</text>
        <text x="90" y="56" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter, sans-serif">Puts in collateral</text>
        
        {/* Contract box */}
        <rect x="210" y="20" width="140" height="80" rx="8" fill="#f0fdf4" stroke="#16a34a" strokeWidth={1.5} />
        <text x="280" y="40" textAnchor="middle" fill="#15803d" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">Smart Contract</text>
        <text x="280" y="56" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter, sans-serif">Holds buyer funds</text>
        <text x="280" y="68" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter, sans-serif">+ seller collateral</text>
        
        {/* Buyer box */}
        <rect x="400" y="20" width="140" height="50" rx="8" fill="#dbeafe" stroke="#2563eb" strokeWidth={1.5} />
        <text x="470" y="40" textAnchor="middle" fill="#1d4ed8" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">Buyer</text>
        <text x="470" y="56" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter, sans-serif">Funds the escrow</text>
        
        {/* Arrows in */}
        <line x1="160" y1="45" x2="210" y2="45" stroke="#4f46e5" strokeWidth={1.5} />
        <polygon points="210,45 205,42 205,48" fill="#4f46e5" />
        
        <line x1="400" y1="45" x2="350" y2="45" stroke="#2563eb" strokeWidth={1.5} />
        <polygon points="350,45 355,42 355,48" fill="#2563eb" />
        
        {/* Outcome paths */}
        <text x="280" y="130" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600" fontFamily="Inter, sans-serif">If deal succeeds</text>
        <line x1="280" y1="100" x2="280" y2="120" stroke="#16a34a" strokeWidth={1.5} />
        <line x1="280" y1="120" x2="90" y2="120" stroke="#16a34a" strokeWidth={1.5} />
        <line x1="90" y1="120" x2="90" y2="145" stroke="#16a34a" strokeWidth={1.5} />
        <polygon points="90,145 87,140 93,140" fill="#16a34a" />
        <text x="90" y="165" textAnchor="middle" fill="#16a34a" fontSize="8" fontFamily="Inter, sans-serif">Seller gets paid +</text>
        <text x="90" y="178" textAnchor="middle" fill="#16a34a" fontSize="8" fontFamily="Inter, sans-serif">collateral back</text>
        
        <text x="280" y="130" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600" fontFamily="Inter, sans-serif"></text>
        <line x1="280" y1="120" x2="470" y2="120" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="4 3" />
        <line x1="470" y1="120" x2="470" y2="145" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="4 3" />
        <polygon points="470,145 467,140 473,140" fill="#dc2626" />
        <text x="470" y="165" textAnchor="middle" fill="#dc2626" fontSize="8" fontFamily="Inter, sans-serif">Buyer gets refund +</text>
        <text x="470" y="178" textAnchor="middle" fill="#dc2626" fontSize="8" fontFamily="Inter, sans-serif">collateral if scam</text>
      </svg>
    </div>
  )
}

function Overview() {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Overview</div>
      <H1>What is BOND</H1>
      <P>
        BOND is an escrow protocol on Arc Testnet. Two strangers can make a deal without trusting each other. Funds get locked in a smart contract and only release when both agree, or an arbiter decides.
      </P>
      <P>
        We built this because the same problem keeps happening. Someone wants to sell a whitelist, an account, or a service. The buyer won't send money first. The seller won't hand over the goods first. Stalemate.
      </P>
      <P>
        BOND breaks the stalemate. You don't trust the other person. You trust the code.
      </P>

      <H2>What Problem It Solves</H2>
      <P>
        Every OTC deal has the same problem. Traditional escrow takes 5-15% and makes you trust a company. BOND uses a smart contract instead. 1% fee. Verifiable by anyone.
      </P>

      <H2>How It's Different</H2>
      <ul className="list-none space-y-3 mb-6">
        {[
          ['No accounts needed', 'Just connect your wallet. No sign-up, no KYC, no email.'],
          ['Transparent by design', 'Every rule is in the smart contract, visible on-chain. No hidden clauses.'],
          ['Collateral protects buyers', 'Sellers can lock their own funds as a guarantee. Scam and they lose it.'],
          ['Built for real deals', 'NFT whitelists, wallet transfers, account sales, freelance work. Anything that needs trust.'],
          ['Timeouts', 'Timers keep deals moving. No one can stall forever.'],
        ].map(([title, desc], i) => (
          <li key={i} className="flex gap-3 text-[14px]">
            <span className="text-stripe-navy dark:text-white font-medium shrink-0 mt-0.5">•</span>
            <div>
              <span className="text-stripe-navy dark:text-white font-medium">{title}</span>
              <span className="text-stripe-body dark:text-gray-400">. {desc}</span>
            </div>
          </li>
        ))}
      </ul>

      <H2>Smart Contract</H2>
      <P>
        BondRoomV21 is deployed on Arc Testnet. The source code is on GitHub and the contract is verified 
        on the block explorer.
      </P>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-500">Address</span>
          <Code>0x7630A99188C5B4199c8ABd06b9462A6eC502AC2C</Code>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-500">Network</span>
          <span className="text-[13px] text-stripe-navy dark:text-white">Arc Testnet</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-500">Token</span>
          <span className="text-[13px] text-stripe-navy dark:text-white">USDC (0x3600000000000000000000000000000000000000)</span>
        </div>
      </div>

      <InfoBox title="Testnet Only" color="amber">
        BOND is currently live on Arc Testnet. All transactions use test USDC, not real money. 
        Use this to learn the flow before mainnet.
      </InfoBox>
    </div>
  )
}

function HowItWorks() {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Guide</div>
      <H1>How a Deal Works</H1>
      <P>
        A BOND deal goes through a fixed sequence of states. Each state has specific actions available 
        and a timer that keeps things moving. Understanding the state machine helps you know exactly 
        what happens at every step.
      </P>

      <H2>The States</H2>
      <Table
        headers={['State', 'Who Acts', 'What Happens']}
        rows={[
          [<><Badge color="slate">CREATED</Badge></>, 'Seller', 'Room is open. Waiting for buyer to join. 1-day timer.'],
          [<><Badge color="purple">JOINED</Badge></>, 'Buyer', 'Buyer entered with the correct code. 1-day timer to fund.'],
          [<><Badge color="amber">FUNDED</Badge></>, 'Seller', 'USDC deposited. Seller must deliver before the deadline (1–90 days).'],
          [<><Badge color="green">DELIVERED</Badge></>, 'Seller', 'Item marked delivered. Buyer confirms or disputes within confirm window (24h–30d depending on deal type).'],
          [<><Badge color="blue">RELEASED</Badge></>, 'Auto / Buyer', 'Funds sent to seller. Deal complete.'],
          [<><Badge color="red">DISPUTED</Badge></>, 'Arbiter', 'Frozen. Arbiter decides: release, refund, or split.'],
          [<><Badge color="amber">REFUNDED</Badge></>, 'Auto / Buyer', 'Buyer refunded. Seller missed deadline or deal expired.'],
          [<><Badge color="slate">EXPIRED</Badge></>, 'Anyone', 'Deadline passed without action. Collateral returned.'],
          [<><Badge color="red">CANCELLED</Badge></>, 'Mutual', 'Both parties agreed to cancel. All funds returned.'],
        ]}
      />

      <H2>Step by Step</H2>

      <H3>1. Create a Room</H3>
      <P>
        The seller sets the deal terms: what they're selling, the price in USDC, how many days for delivery, 
        and optionally a collateral amount. BOND generates a secret join code. Only someone with this code 
        can enter the room.
      </P>
      <P>
        The seller sends the invite link however they want. Telegram, Discord, Twitter DM, email. Doesn't matter. The join code is never exposed in the link; it's verified on-chain when the buyer joins.
      </P>

      <H3>2. Join the Room</H3>
      <P>
        The buyer opens the link, connects their wallet, and enters the join code. If the code matches 
        the hashed value stored in the contract, they become the official buyer. The room state changes 
        from CREATED to JOINED.
      </P>
      <InfoBox title="Join Timer" color="blue">
        The buyer has 1 day from room creation to join. After that, anyone can call expireRoom() to close 
        it and return the seller's collateral.
      </InfoBox>

      <H3>3. Fund the Escrow</H3>
      <P>
        After joining, the buyer must deposit the full deal amount plus a 1% platform fee into the contract. 
        For a 500 USDC deal, the buyer sends 505 USDC. The 500 USDC is locked as escrow. The 5 USDC fee 
        goes to the treasury.
      </P>
      <P>
        Once funded, the room is FUNDED. The seller has the delivery window (1 to 90 days, set at creation) to deliver. No one can pull out alone at this point.
      </P>
      <InfoBox title="Fund Timer" color="blue">
        The buyer has 30 minutes to fund after joining. If they don't, anyone can expire the room.
      </InfoBox>

      <H3>4. Seller Delivers</H3>
      <P>
        The seller does what they agreed to. Sends the NFT, transfers the account, finishes the work. Then clicks "Mark as Delivered". They can attach an optional message or proof link.
      </P>
      <P>
        The room state changes to DELIVERED. This starts the confirm window timer. The buyer must 
        check what they received and respond.
      </P>
      <InfoBox title="Delivery Timer" color="blue">
        The seller must deliver before the delivery deadline (1–90 days from creation, default 7 days). 
        If they miss it, the buyer can call buyerRefund() to get their money back plus the seller's collateral.
      </InfoBox>

      <H3>5. Buyer Responds</H3>
      <P>
        The buyer now has two options:
      </P>
      <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px] text-stripe-body dark:text-gray-400">
        <li>
          <strong className="text-stripe-navy dark:text-white">Confirm</strong>. Everything checks out. 
          Funds go to the seller, collateral comes back, deal done.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Dispute</strong>. Something went wrong. 
          Funds freeze. Buyer opens a Discord ticket for arbiter review.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Mutual Cancel</strong>. Both parties agree 
          to walk away. No arbiter. All funds returned.
        </li>
      </ul>

      <H3>6. Escalate (Safety Net)</H3>
      <P>
        If the buyer doesn't confirm or dispute within the confirm window, the seller can escalate to the arbiter.
        This prevents buyers from holding funds hostage by simply doing nothing.
      </P>
      <P>
        Confirm window depends on deal type: 24 hours for Instant (digital goods), 30 days for Event Based (WL, mints), 
        7 days for Service (freelance, custom work). The seller clicks "Escalate" and the arbiter takes over.
      </P>

      <StateFlowDiagram />

      <H2>Cancellation (Before Funding)</H2>
      <P>
        Before funding, anyone can walk away free. Seller cancels, or buyer leaves. Collateral goes back to the seller. Room closes. No fees.
      </P>
      <P>
        Useful when plans change, buyer gets cold feet, or seller realizes they can't deliver.
      </P>
    </div>
  )
}

function MarketDoc() {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Marketplace</div>
      <H1>BOND Market</H1>
      <P>
        The Market is where sellers post listings and buyers discover deals. Think of it as a storefront 
        for escrow-enabled transactions. each listing is a pre-configured deal that opens a trustless 
        escrow room with one click.
      </P>
      <P>
        Unlike regular marketplaces, BOND listings connect straight to the escrow. Click "Open Deal" and the room creates itself with price, category, and delivery timeline filled in.
      </P>

      <H2>Posting a Listing</H2>
      <P>
        Sellers create a listing by filling out a short form. The listing appears in the Market immediately 
        and stays active until someone opens a deal or the seller deletes it.
      </P>

      <Table
        headers={['Field', 'Required', 'Description']}
        rows={[
          ['Title', 'Yes', 'Short, clear name of what you are selling. 100 characters max.'],
          ['Description', 'No', 'Details the buyer should know. condition, restrictions, etc. 500 characters max.'],
          ['Category', 'Yes', 'NFT, Wallet, Account, Service, or Other. Helps buyers filter.'],
          ['Price', 'Yes', 'Deal amount in USDC. Must be greater than 0.'],
          ['Collateral', 'No', 'Amount you lock as a guarantee. Defaults to 0.'],
          ['Delivery', 'Yes', 'How many days you need to deliver. 1 to 90 days.'],
          ['Social Contacts', 'No', 'Twitter, Telegram, or Discord for buyers to reach you.'],
        ]}
      />

      <H2>Buyer & Seller Listings</H2>
      <P>
        Most listings are sellers. But buyers can post too. "I want a wallet with specific NFTs." "Looking for a landing page designer." A seller sees it and clicks "Sell to Them."
      </P>
      <P>
        Buyer listings have a blue accent stripe. Seller listings have a gray one. This visual cue 
        helps you instantly know who is offering and who is seeking.
      </P>

      <H2>Contact Before You Commit</H2>
      <P>
        We strongly recommend chatting with the other party before opening a deal. Every listing 
        can include social links. Twitter/X and Telegram are clickable. Discord shows the username.
      </P>
      <P>
        Use this pre-deal chat to verify availability, negotiate terms, and build enough comfort 
        to proceed. The escrow handles the money, but trust still matters for the experience.
      </P>

      <InfoBox title="Pro Tip" color="green">
        Listings with contact information get significantly more engagement. Buyers feel safer 
        when they can verify you're a real person before sending funds.
      </InfoBox>

      <H2>Searching & Filtering</H2>
      <P>
        Use the search bar to find listings by title or description. Filter by category to narrow 
        down the results. Sort by newest, price (low to high or high to low), or fastest delivery.
      </P>

      <H2>Managing Your Listings</H2>
      <P>
        You can delete any listing you created as long as no one has opened a deal from it. 
        Once a deal is in progress, the listing is marked "In Progress" and can't be deleted.
      </P>

      <H2>Offers System</H2>
      <P>
        Instead of accepting the listed price, buyers can make an offer. The seller sees all 
        offers in a panel and can accept one, which creates the escrow room with the offered price. 
        This gives both sides room to negotiate without committing upfront.
      </P>
    </div>
  )
}

function Collateral() {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Mechanism</div>
      <H1>Collateral System</H1>
      <P>
        Collateral is the seller's own money locked with the buyer's deposit. One purpose: make scamming cost more than delivering. If a seller runs, they lose the buyer's funds AND their own collateral.
      </P>

      <CollateralDiagram />

      <H2>How It Works</H2>
      <P>
        When creating a room, the seller can choose to lock any amount of USDC as collateral. 
        Sent in the same transaction as room creation. The contract holds it until the deal resolves.
      </P>
      <P>
        Collateral is completely optional. You can set it to 0. But for high-value deals or 
        when dealing with strangers, a meaningful collateral amount signals seriousness and 
        reduces the buyer's risk.
      </P>

      <H2>Where Collateral Goes</H2>
      <Table
        headers={['Outcome', 'Price', 'Collateral']}
        rows={[
          [<><Badge color="green">Success</Badge> Buyer confirms</>, '→ Seller', '→ Returned to seller'],
          [<><Badge color="red">No delivery</Badge> Seller misses deadline</>, '→ Refunded to buyer', '→ Given to buyer as penalty'],
          [<><Badge color="amber">Cancel</Badge> Before funding</>, 'N/A', '→ Returned to seller'],
          [<><Badge color="amber">Expire</Badge> No one joins or funds</>, 'N/A', '→ Returned to seller'],
          [<><Badge color="red">Mutual Cancel</Badge> Both parties agree</>, '→ Refunded to buyer', '→ Returned to seller'],
          [<><Badge color="purple">Arbiter: Seller wins</Badge></>, '→ Seller', '→ Returned to seller'],
          [<><Badge color="purple">Arbiter: Buyer wins</Badge></>, '→ Refunded to buyer', '→ Given to buyer'],
          [<><Badge color="purple">Arbiter: 50/50</Badge></>, 'Split evenly', '→ Given to buyer'],
        ]}
      />

      <H2>How Much Should You Lock?</H2>
      <P>
        There's no fixed rule, but here are some practical guidelines based on deal type and trust level:
      </P>
      <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px] text-stripe-body dark:text-gray-400">
        <li>
          <strong className="text-stripe-navy dark:text-white">Trusted counterparty</strong>. 0% to 5%. 
          You know them from a community or past deals.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Stranger, low risk</strong>. 5% to 15%. 
          Small amounts, reversible goods, or services with clear deliverables.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Stranger, high risk</strong>. 15% to 50%. 
          Wallet sales, expensive NFTs, or anything involving account credentials.
        </li>
      </ul>
      <P>
        Higher collateral makes buyers more likely to choose your listing. It also means more 
        of your own capital is at risk, so find a balance that makes sense for your situation.
      </P>

      <InfoBox title="Important" color="amber">
        Collateral stays locked the whole deal. If the buyer uses the full delivery window, your collateral is stuck until it resolves. Plan accordingly.
      </InfoBox>
    </div>
  )
}

function MutualCancel() {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Mechanism</div>
      <H1>Mutual Cancel</H1>
      <P>
        Both parties can agree to cancel and get their funds back. No arbiter. Useful when plans change or both want out.
      </P>

      <MutualCancelDiagram />

      <H2>How It Works</H2>
      <P>
        Mutual cancel works after the buyer joins and before the deal ends. Either party requests, the other approves, then anyone executes. Both need to agree. No one-sided cancel.
      </P>

      <H3>Step by Step</H3>
      <ol className="list-decimal pl-6 space-y-3 mb-6 text-[14px] text-stripe-body dark:text-gray-400">
        <li>
          <strong className="text-stripe-navy dark:text-white">Request</strong>. Either party clicks 
          "Request Mutual Cancel". Recorded on-chain.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Approve</strong>. The other party clicks 
          "Approve Mutual Cancel" to confirm.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Execute</strong>. Once both approved, 
          anyone clicks "Execute Mutual Cancel". Funds return immediately.
        </li>
      </ol>

      <InfoBox title="Revoke" color="blue">
        Either party can revoke their approval anytime before execution. After execution, the cancel 
        is final and cannot be undone.
      </InfoBox>

      <H2>What Gets Returned</H2>
      <Table
        headers={['Party', 'What They Get Back']}
        rows={[
          ['Buyer', 'Full funded amount (price + fee already deducted)'],
          ['Seller', 'Collateral locked at creation'],
        ]}
      />

      <H2>When It's Available</H2>
      <P>
        Mutual cancel is available in these states: <strong className="text-stripe-navy dark:text-white">Joined</strong>, 
        <strong className="text-stripe-navy dark:text-white"> Funded</strong>, and 
        <strong className="text-stripe-navy dark:text-white"> Delivered</strong>. Once the deal is Released, 
        Refunded, Expired, Disputed, or Cancelled, mutual cancel is no longer available.
      </P>

      <H2>Why Use It</H2>
      <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px] text-stripe-body dark:text-gray-400">
        <li>
          <strong className="text-stripe-navy dark:text-white">Faster than dispute</strong>. No waiting for an arbiter. 
          Both agree and it's done in minutes.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">No fees</strong>. No extra charges. 
          Everything comes back as-is.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Preserves reputation</strong>. Mutual cancel 
          doesn't count as a failed deal.
        </li>
      </ul>
    </div>
  )
}

function Disputes() {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Mechanism</div>
      <H1>Dispute Resolution</H1>
      <P>
        Most deals complete smoothly. But when they don't, BOND has two layers of resolution: 
        automatic rules handled by the smart contract for clear-cut cases, and human arbitration 
        for situations where context and judgment matter.
      </P>

      <H2>Automatic Resolution (No Arbiter Needed)</H2>
      <P>
        The contract handles these situations without any human involvement:
      </P>
      <Table
        headers={['Situation', 'Who Calls', 'Result']}
        rows={[
          ['Seller never delivers within deadline', 'Buyer', 'Full refund + collateral to buyer'],
          ['Buyer confirms receipt', 'Buyer', 'Funds + collateral released to seller'],
          ['Seller cancels before funding', 'Seller', 'Collateral returned, room closed'],
          ['Buyer leaves before funding', 'Buyer', 'Collateral returned, room closed'],
          ['No one joins within 1 day', 'Anyone', 'Collateral returned, room expired'],
          ['Buyer never funds within 1 day', 'Anyone', 'Collateral returned, room expired'],
        ]}
      />

      <H2>When a Dispute Happens</H2>
      <P>
        A dispute starts when the buyer clicks "Dispute" after delivery. Funds freeze immediately. No one touches the money until the arbiter decides.
      </P>

      <H3>The Dispute Process</H3>
      <ol className="list-decimal pl-6 space-y-3 mb-6 text-[14px] text-stripe-body dark:text-gray-400">
        <li>
          <strong className="text-stripe-navy dark:text-white">Buyer disputes</strong>. Clicking "Dispute" 
          freezes all funds and stops auto-release.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Open a ticket</strong>. Buyer opens 
          a Discord ticket. Include room number and what went wrong.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Present evidence</strong>. Both parties 
          share screenshots, tx hashes, chat logs. Arbiter reviews before deciding.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Arbiter investigates</strong>. Arbiter 
          checks evidence, asks questions if needed, decides the outcome.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">On-chain execution</strong>. Arbiter 
          calls one of three resolution functions. Immediate and irreversible.
        </li>
      </ol>

      <H2>Arbiter Decisions</H2>
      <Table
        headers={['Decision', 'When Used', 'Outcome']}
        rows={[
          ['Release to Seller', 'Seller delivered properly; buyer is being unreasonable', 'Seller gets price + collateral back'],
          ['Refund to Buyer', 'Seller scammed, delivered wrong item, or did not deliver at all', 'Buyer gets price + collateral'],
          ['50/50 Split', 'Partial delivery, shared fault, or unclear situation', 'Each gets half the price; collateral goes to buyer'],
        ]}
      />

      <InfoBox title="No Timeout During Dispute" color="amber">
        Unlike the delivery phase, disputes have no automatic timeout. Funds stay frozen until 
        the arbiter acts. This prevents griefers from exploiting timers, but it also means disputes 
        require patience. The arbiter typically responds within 24 hours.
      </InfoBox>

      <H2>Arbiter Limitations</H2>
      <P>
        The arbiter address is set at contract deployment and can be updated by the contract owner if needed. 
        They can only execute the three predefined resolutions. They cannot steal funds, send money elsewhere, or modify deal terms. Their power is strictly bounded by the contract code.
      </P>
    </div>
  )
}

function Timers() {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Reference</div>
      <H1>Timers & Deadlines</H1>
      <P>
        BOND uses timeouts to keep deals moving. No one can stall forever. Every timer is on-chain. No one can override or extend them.
      </P>

      <Table
        headers={['Phase', 'Duration', 'What Triggers It', 'What Happens If Expired']}
        rows={[
          ['Join', '1 day', 'Room is created', 'Anyone can expire the room; collateral returns to seller'],
          ['Fund', '30 minutes', 'Buyer joins the room', 'Anyone can expire the room; collateral returns to seller'],
          ['Deliver', '1–90 days', 'Buyer funds the escrow', 'Buyer can call buyerRefund() for full refund + collateral'],
          ['Confirm Window', '24h / 7d / 30d', 'Seller marks as delivered', 'Buyer confirms or seller escalates to arbiter'],
          ['Dispute Arbiter', 'No timeout', 'Buyer clicks Dispute', 'Frozen until arbiter resolves'],
        ]}
      />

      <H2>Who Can Call expireRoom()?</H2>
      <P>
        After a timer expires, <strong className="text-stripe-navy dark:text-white">anyone</strong> can 
        call <Code>expireRoom()</Code> to close the room and return collateral. This is intentional. 
        it doesn't require the seller or buyer to take action, which is useful if one party has gone 
        offline.
      </P>
      <P>
        There's no reward for calling expireRoom(). It simply cleans up stale rooms and frees the 
        active room slots for both parties (each wallet can have up to 3 active rooms).
      </P>

      <H2>Timer Strategy Tips</H2>
      <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px] text-stripe-body dark:text-gray-400">
        <li>
          <strong className="text-stripe-navy dark:text-white">Share the invite link immediately</strong>. 
          The 1-day join timer starts when you create the room, not when you send the link.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Fund promptly after joining</strong>. 
          1 day is generous, but don't cut it close if you're serious about the deal.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Set realistic delivery days</strong>. 
          The Market lets you specify 1 to 90 days for delivery. Set a timeline that matches 
          the actual work needed.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Check delivery within the confirm window</strong>. 
          Once the seller marks delivered, you have a confirm window to verify and respond. The window depends on deal type: 24h for Instant, 7d for Service, 30d for Event Based. Set a reminder.
        </li>
      </ul>
    </div>
  )
}

function Fees() {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Reference</div>
      <H1>Fees</H1>
      <P>
        BOND is designed to be affordable. The only fee is a 1% platform charge, taken only when 
        the buyer funds the escrow. Everything else is free.
      </P>

      <Table
        headers={['Action', 'Fee']}
        rows={[
          ['Create room', 'FREE (gas only)'],
          ['Join room', 'FREE (gas only)'],
          ['Fund room', '1% of deal price'],
          ['Mark delivered', 'FREE (gas only)'],
          ['Confirm receipt', 'FREE (gas only)'],
          ['Dispute', 'FREE (gas only)'],
          ['Cancel / Leave (before funding)', 'FREE (gas only)'],
          ['Expire room', 'FREE (gas only)'],
          ['Mutual cancel', 'FREE (gas only). full refund'],
        ]}
      />

      <H2>Fee Calculation</H2>
      <P>
        The fee is 1% of the deal price, rounded to the nearest wei. For a 100 USDC deal, the buyer 
        sends 101 USDC total. The contract locks 100 USDC as escrow and sends 1 USDC to the treasury 
        address immediately upon funding.
      </P>
      <P>
        The fee is paid by the buyer at funding time. The seller receives the full deal price 
        (minus nothing) upon release. Collateral is never touched by fees. it always goes back 
        to the seller or to the buyer depending on the outcome.
      </P>

      <H2>Gas Costs</H2>
      <P>
        Arc Testnet uses USDC for gas, which makes costs predictable. Most BOND transactions cost 
        around $0.01 in USDC. The most expensive operation is creating a room (around $0.02) because 
        it stores data on-chain.
      </P>

      <InfoBox title="Note" color="blue">
        These fees apply to the current testnet deployment. A mainnet version may adjust fees based 
        on operational costs, but the principle stays the same: charge once, at funding, and keep 
        it minimal.
      </InfoBox>
    </div>
  )
}

function Security() {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Security</div>
      <H1>Security Model</H1>
      <P>
        BOND is built on a simple security principle: minimize trust and maximize transparency. 
        Here's how the system protects both parties.
      </P>

      <H2>Smart Contract Guarantees</H2>
      <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px] text-stripe-body dark:text-gray-400">
        <li>
          <strong className="text-stripe-navy dark:text-white">Funds are locked</strong>. Once deposited, 
          USDC sits in the contract. Neither the buyer nor the seller can withdraw it unilaterally.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">No admin withdrawal</strong>. The contract 
          owner cannot drain funds. The only way money leaves is through the defined resolution paths.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Arbiter is bounded</strong>. The arbiter 
          can only call three functions: release to seller, refund to buyer, or 50/50 split. They cannot 
          send funds to themselves or any other address.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">State machine is strict</strong>. Every 
          action checks the current room state. You can't fund a room that's already funded, or dispute 
          a room that hasn't been delivered.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Join codes are hashed</strong>. The actual 
          code is never stored on-chain. Only its hash is stored. This means even if someone reads the 
          blockchain, they can't reconstruct the join code.
        </li>
      </ul>

      <H2>Verified & Audited</H2>
      <P>
        The contract source code is published on GitHub and verified on Arc Testnet's block explorer. 
        Anyone can read the code, compile it, and verify that the deployed bytecode matches.
      </P>

      <H2>What We Don't Protect Against</H2>
      <P>
        BOND handles the money side of trust, but it can't verify the quality of what's being exchanged. 
        If a seller delivers something technically "correct" but low quality, that's a judgment call for 
        the arbiter. Similarly, if both parties collude to game the system, the contract can't detect 
        off-chain coordination.
      </P>
      <P>
        For this reason, we recommend starting with small deals, using collateral for larger ones, 
        and always chatting with the other party before committing funds.
      </P>

      <H2>Wallet Security</H2>
      <P>
        BOND never asks for your private key or seed phrase. All transactions are signed by your own 
        wallet (MetaMask or any WalletConnect-compatible wallet). The app is a pure frontend. it 
        doesn't hold keys, passwords, or personal data.
      </P>
    </div>
  )
}

function FAQ() {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Support</div>
      <H1>Frequently Asked Questions</H1>

      <div className="space-y-4">
        <FaqItem q="What happens if the seller never delivers?">
          If the seller doesn't mark delivery before the deadline (1–90 days), the buyer can call 
          <Code>buyerRefund()</Code> at any time. The buyer gets their full payment back, plus 
          the seller's collateral as compensation. This is automatic. no arbiter needed.
        </FaqItem>

        <FaqItem q="Can I cancel after funding?">
          No. Once the escrow is funded, the deal must play out through the normal flow or dispute 
          process. This is intentional. it prevents either side from backing out at the last second 
          after the other party has already committed time or resources.
        </FaqItem>

        <FaqItem q="What if I send the wrong join code?">
          The join code is verified on-chain against a hash. If it doesn't match, the transaction 
          reverts and no join happens. You'll need to get the correct code from the seller. If the 
          seller gave you the wrong code, they can cancel and create a new room.
        </FaqItem>

        <FaqItem q="Can the arbiter steal my funds?">
          No. The arbiter address is fixed at deployment and can only execute three specific functions: 
          release to seller, refund to buyer, or 50/50 split. They cannot send funds to themselves 
          or any external address. Their power is hardcoded and bounded.
        </FaqItem>

        <FaqItem q="How many rooms can I have at once?">
          Each wallet can have up to 3 active rooms simultaneously. This prevents spam and keeps 
          the system manageable. You can create a new room after an existing one is resolved, expired, 
          or cancelled.
        </FaqItem>

        <FaqItem q="Is collateral required?">
          No. Collateral defaults to 0 and is entirely optional. For trusted counterparties or low-value 
          deals, 0 collateral is fine. For strangers and high-value items, we recommend 10–50% of the 
          deal price to signal trustworthiness.
        </FaqItem>

        <FaqItem q="What chains are supported?">
          Currently Arc Testnet only. The contract is written in Solidity 0.8.28 and is EVM-compatible, 
          so it could theoretically be deployed to any EVM chain. Mainnet deployment is planned but not 
          yet scheduled.
        </FaqItem>

        <FaqItem q="Do I need to keep the app open?">
          No. All timers and deadlines are enforced by the smart contract on-chain. You can close 
          the app, turn off your computer, and come back later. The contract state is permanent and 
          accessible from any device with your wallet.
        </FaqItem>

        <FaqItem q="What if the buyer never confirms?">
          After the seller marks delivery, the buyer has a confirm window to confirm or dispute (24h for Instant, 7d for Service, 30d for Event Based). If they do 
          nothing, the seller can escalate to the arbiter. The arbiter reviews the delivery proof and decides — release to seller, refund to buyer, or split. This prevents buyers from holding funds 
          hostage by simply going silent.
        </FaqItem>

        <FaqItem q="Can I use BOND for physical goods?">
          BOND is designed for digital goods and services where delivery is instant or near-instant. 
          Physical goods involve shipping times, proof-of-delivery disputes, and other complexities 
          that are harder to verify on-chain. We don't recommend it for physical items at this stage.
        </FaqItem>

        <FaqItem q="What happens to my data?">
          BOND doesn't collect personal data. Listings are stored on a backend server, but only the 
          public information you choose to share (title, description, price, social links). Wallet 
        addresses are public on-chain anyway. No emails, no phone numbers, no KYC.
        </FaqItem>
      </div>
    </div>
  )
}

function FaqItem({ q, children }) {
  return (
    <div className="border border-stripe-border dark:border-white/10 rounded-lg p-4">
      <div className="text-[14px] font-semibold text-stripe-navy dark:text-white mb-2">{q}</div>
      <div className="text-[13px] text-stripe-body dark:text-gray-400 leading-[1.6]">{children}</div>
    </div>
  )
}

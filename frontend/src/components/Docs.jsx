import { useParams, Link } from 'react-router-dom'

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'market', label: 'Market' },
  { id: 'collateral', label: 'Collateral' },
  { id: 'disputes', label: 'Disputes' },
  { id: 'timers', label: 'Timers & Deadlines' },
  { id: 'fees', label: 'Fees' },
  { id: 'faq', label: 'FAQ' },
]

export default function Docs() {
  const { section } = useParams()
  const active = section || 'overview'

  return (
    <section className="pt-24 pb-32 px-4 sm:px-6 min-h-screen">
      <div className="max-w-[900px] mx-auto flex gap-8">
        {/* Sidebar */}
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
                    : 'text-stripe-body dark:text-gray-400 hover:text-stripe-navy dark:text-white hover:bg-stripe-surface dark:bg-white/5'
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Mobile nav */}
        <div className="md:hidden flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
          {SECTIONS.map((s) => (
            <Link
              key={s.id}
              to={`/docs/${s.id}`}
              className={`text-[11px] px-3 py-1.5 rounded-full whitespace-nowrap no-underline border ${
                active === s.id
                  ? 'bg-stripe-navy text-white border-stripe-navy'
                  : 'text-stripe-body dark:text-gray-400 border-stripe-border dark:border-white/10 hover:border-stripe-navy'
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {active === 'overview' && <Overview />}
          {active === 'how-it-works' && <HowItWorks />}
          {active === 'market' && <MarketDoc />}
          {active === 'collateral' && <Collateral />}
          {active === 'disputes' && <Disputes />}
          {active === 'timers' && <Timers />}
          {active === 'fees' && <Fees />}
          {active === 'faq' && <FAQ />}
        </div>
      </div>
    </section>
  )
}

function H1({ children }) {
  return <h1 className="text-[28px] font-light text-stripe-navy dark:text-white mb-2" style={{ letterSpacing: '-0.56px' }}>{children}</h1>
}

function H2({ children }) {
  return <h2 className="text-[18px] font-semibold text-stripe-navy dark:text-white mt-8 mb-3">{children}</h2>
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
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  }
  return <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider border ${colors[color]}`}>{children}</span>
}

// ════════════════════════════════════════════════════════

function Overview() {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Overview</div>
      <H1>BOND — Trustless Escrow</H1>
      <P>
        BOND is a trustless escrow protocol on Arc Testnet. It lets two strangers
        transact safely — funds are locked in a smart contract until both sides are happy.
      </P>
      <P>
        Originally built for OTC deals that live in Telegram groups and Discord DMs:
        NFT whitelist spots, wallet sales, freelance gigs, account transfers —
        basically anything where you'd normally ask "who goes first?" and nobody wants to.
      </P>

      <H2>Why BOND Exists</H2>
      <P>
        Every OTC deal has the same problem: one side has to trust the other first.
        Escrow solves this, but traditional escrow services take 5-15% and you're
        trusting a company not to disappear with your money.
      </P>
      <P>
        BOND replaces the middleman with a smart contract. The code is the escrow.
        1% fee, no accounts, no KYC — just connect your wallet.
      </P>

      <H2>Key Properties</H2>
      <ul className="list-none space-y-2 mb-6">
        {[
          ['Trustless', 'Funds locked in smart contract. Neither party can steal.'],
          ['Collateral', 'Seller locks guarantee. Scam = lose collateral.'],
          ['Marketplace', 'Browse listings, post deals, negotiate directly.'],
          ['No signup', 'Connect wallet, create room, share invite link.'],
          ['Arbiter', 'Complex disputes handled by a human arbiter via Discord.'],
          ['Free to create', '1% fee only when deal is actually funded.'],
        ].map(([title, desc], i) => (
          <li key={i} className="flex gap-3 text-[14px]">
            <span className="text-stripe-navy dark:text-white font-medium shrink-0">✓ {title}</span>
            <span className="text-stripe-body dark:text-gray-400">{desc}</span>
          </li>
        ))}
      </ul>

      <H2>Contract</H2>
      <P>
        BondRoomV12 on Arc Testnet.{' '}
        <Code>0x25363A6EA54f8b2Aa78945226EFEbb18068D7760</Code>
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
        BOND Market is a forum-style marketplace where sellers post listings and buyers browse deals.
        Each listing can open a trustless escrow room with one click.
      </P>
      <P>
        Think of it as a decentralized alternative to PlayerUp — but with smart contract escrow
        instead of a middleman. No trust needed.
      </P>

      <H2>How It Works</H2>
      <ol className="list-decimal pl-6 space-y-2 mb-6 text-[14px] text-stripe-body dark:text-gray-400">
        <li><strong className="text-stripe-navy dark:text-white">Seller posts listing</strong> — title, description, category, price, collateral, and optional social media contacts.</li>
        <li><strong className="text-stripe-navy dark:text-white">Buyer browses</strong> — filter by category (NFT, Wallet, Account, Service, Other).</li>
        <li><strong className="text-stripe-navy dark:text-white">Chat first</strong> — buyer contacts seller via Twitter, Telegram, or Discord to discuss details.</li>
        <li><strong className="text-stripe-navy dark:text-white">Open Deal</strong> — buyer clicks "Open Deal" which auto-creates an escrow room with pre-filled data.</li>
        <li><strong className="text-stripe-navy dark:text-white">Normal escrow flow</strong> — join, fund, deliver, confirm.</li>
      </ol>

      <H2>Listing Fields</H2>
      <Table
        headers={['Field', 'Required', 'Description']}
        rows={[
          ['Title', 'Yes', 'Short name of what you are selling'],
          ['Description', 'No', 'Details about the item — what buyers should know'],
          ['Category', 'Yes', 'NFT, Wallet, Account, Service, or Other'],
          ['Price', 'Yes', 'Deal amount in USDC'],
          ['Collateral', 'No', 'Seller guarantee amount (default: 0)'],
          ['Twitter', 'No', 'Twitter/X handle for buyer contact'],
          ['Telegram', 'No', 'Telegram handle for buyer contact'],
          ['Discord', 'No', 'Discord username for buyer contact'],
        ]}
      />

      <H2>Categories</H2>
      <Table
        headers={['Category', 'Use Case']}
        rows={[
          ['NFT', 'Whitelist spots, NFT sales, mints'],
          ['Wallet', 'Wallet surrender, seed phrase transfer'],
          ['Account', 'Social media, game accounts, email'],
          ['Service', 'Audits, development, consulting'],
          ['Other', 'Anything else'],
        ]}
      />

      <H2>Contact Before Deal</H2>
      <P>
        Buyers can contact sellers before opening an escrow. This allows negotiation,
        verification of availability, and building trust before committing funds.
      </P>
      <P>
        Social media links are clickable — Twitter and Telegram open in a new tab.
        Discord shows the username for manual lookup.
      </P>

      <H2>Seller Actions</H2>
      <ul className="list-disc pl-6 space-y-1 mb-4 text-[14px] text-stripe-body dark:text-gray-400">
        <li><strong className="text-stripe-navy dark:text-white">Post listing</strong> — fill form, add socials, submit.</li>
        <li><strong className="text-stripe-navy dark:text-white">Delete listing</strong> — only the creator can delete their own listing.</li>
      </ul>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="text-[13px] text-blue-800 font-medium mb-1">Tip</div>
        <div className="text-[12px] text-blue-700">
          Add your social media contacts so buyers can chat with you first.
          Deals with contact info get more attention — buyers feel safer.
        </div>
      </div>
    </div>
  )
}

function HowItWorks() {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Guide</div>
      <H1>How It Works</H1>
      <P>Here's how a BOND deal works from start to finish.</P>

      <H2>1. Create a Room</H2>
      <P>
        One party creates a room: what they're selling, the price, and optionally
        a collateral amount (their "skin in the game"). A secret join code is generated.
      </P>
      <P>
        You'll get an invite link — send it to the other party. Only someone with
        the correct code can join.
      </P>

      <H2>2. The Other Party Joins</H2>
      <P>
        They open the link, connect their wallet, and join. Once they're in, they have
        30 minutes to fund the deal.
      </P>

      <H2>3. Fund the Deal</H2>
      <P>
        The buyer sends the deal amount (plus a 1% platform fee) to the contract.
        That's it — the money is now locked. Neither side can touch it unless the contract says so.
      </P>

      <H2>4. Seller Delivers</H2>
      <P>
        The seller does whatever they promised — sends the NFT whitelist, hands over the wallet,
        completes the service — then marks it as delivered. They can optionally attach proof.
      </P>

      <H2>5. Buyer Confirms or Disputes</H2>
      <P>
        The buyer checks what they received. Two options:
      </P>
      <ul className="list-disc pl-6 space-y-1 mb-4 text-[14px] text-stripe-body dark:text-gray-400">
        <li><strong className="text-stripe-navy dark:text-white">Confirm</strong> — funds go to seller, collateral returned, deal done.</li>
        <li><strong className="text-stripe-navy dark:text-white">Dispute</strong> — funds frozen, open a Discord ticket for an arbiter.</li>
      </ul>

      <H2>6. Auto-Release (2h)</H2>
      <P>
        If the buyer doesn't confirm or dispute within 2 hours, the funds auto-release
        to the seller. This keeps things moving — no one can hold funds hostage.
      </P>

      {/* Flow diagram */}
      <div className="border border-stripe-border dark:border-white/10 rounded-lg p-5 my-6 bg-stripe-surface dark:bg-white/5">
        <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-4 text-center">Normal Flow</div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-[12px] font-mono">
          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded">Create</span>
          <span className="text-stripe-body dark:text-gray-400">→</span>
          <span className="bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded">Join</span>
          <span className="text-stripe-body dark:text-gray-400">→</span>
          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded">Fund</span>
          <span className="text-stripe-body dark:text-gray-400">→</span>
          <span className="bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded">Deliver</span>
          <span className="text-stripe-body dark:text-gray-400">→</span>
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded">Confirm → Release</span>
        </div>
        <div className="text-center text-stripe-body dark:text-gray-400 text-[12px] my-2">or</div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-[12px] font-mono">
          <span className="bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded">Deliver</span>
          <span className="text-stripe-body dark:text-gray-400">→</span>
          <span className="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded">Dispute</span>
          <span className="text-stripe-body dark:text-gray-400">→</span>
          <span className="bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded">Discord Ticket → Arbiter</span>
        </div>
      </div>
    </div>
  )
}

function Collateral() {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Mechanism</div>
      <H1>Collateral System</H1>
      <P>
        Collateral is the seller's "skin in the game." When creating a room, the seller
        can lock up some of their own USDC as a guarantee. If they scam, they lose it.
      </P>

      <H2>How It Works</H2>
      <P>
        The seller sends collateral along with the <Code>createRoom()</Code> transaction.
        The contract holds it until the deal resolves. It can be 0 if you don't need it.
      </P>

      <H2>What Happens to Collateral</H2>
      <Table
        headers={['Scenario', 'Price', 'Collateral']}
        rows={[
          [<><Badge color="green">SUCCESS</Badge> Buyer confirms</>, '→ Seller', '→ Seller (returned)'],
          [<><Badge color="red">FAIL</Badge> Seller doesn't deliver</>, '→ Buyer', '→ Buyer (penalty)'],
          [<><Badge color="amber">CANCEL</Badge> Before funded</>, '→ Buyer', '→ Seller (returned)'],
          [<><Badge color="purple">ARBITER</Badge> Seller wins</>, '→ Seller', '→ Seller (returned)'],
          [<><Badge color="purple">ARBITER</Badge> Buyer wins</>, '→ Buyer', '→ Buyer'],
          [<><Badge color="purple">ARBITER</Badge> 50/50 split</>, '→ 50/50', '→ Buyer'],
        ]}
      />

      <H2>Simple Version</H2>
      <ul className="list-disc pl-6 space-y-1 mb-4 text-[14px] text-stripe-body dark:text-gray-400">
        <li><strong className="text-stripe-navy dark:text-white">Cancel before funded</strong> — nobody got hurt, collateral goes back to seller.</li>
        <li><strong className="text-stripe-navy dark:text-white">Seller doesn't deliver</strong> — buyer gets the collateral on top of their refund.</li>
        <li><strong className="text-stripe-navy dark:text-white">Everything goes well</strong> — seller gets collateral back.</li>
      </ul>

      <H2>How Much Collateral?</H2>
      <P>
        Totally up to you. For high-value stuff (wallet surrender, expensive NFTs),
        10-50% of the deal value is reasonable. For lower-stakes or trusted counterparty
        deals, 0 is fine.
      </P>
      <P>
        Higher collateral = more trust from buyers = faster deals. But also more risk for sellers.
      </P>
    </div>
  )
}

function Disputes() {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Mechanism</div>
      <H1>Dispute Resolution</H1>

      <H2>Simple Cases (Handled by Code)</H2>
      <P>
        These situations are resolved automatically by the smart contract:
      </P>
      <Table
        headers={['Case', 'Action', 'Result']}
        rows={[
          ['Seller doesn\'t deliver in time', 'buyerRefund()', 'Buyer gets price + collateral'],
          ['Buyer confirms receipt', 'releaseFunds()', 'Seller gets price + collateral'],
          ['Cancel before funded', 'cancelRoom() / leaveRoom()', 'Collateral returns to seller'],
          ['Nobody joins', 'expireRoom()', 'Collateral returns to seller'],
        ]}
      />

      <H2>Complex Cases (Discord Ticket)</H2>
      <P>
        When both parties disagree on whether delivery was satisfactory, the dispute enters
        a human review process:
      </P>
      <ol className="list-decimal pl-6 space-y-2 mb-4 text-[14px] text-stripe-body dark:text-gray-400">
        <li>Buyer clicks <strong className="text-stripe-navy dark:text-white">Dispute</strong> in the room</li>
        <li>Funds are <strong className="text-stripe-navy dark:text-white">frozen</strong> — auto-release timer stops</li>
        <li>Buyer opens a ticket in the BOND Discord server</li>
        <li>Both parties present evidence</li>
        <li>Arbiter investigates and makes a decision</li>
        <li>Arbiter executes on-chain: release to seller, refund to buyer, or 50/50 split</li>
      </ol>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="text-[13px] text-amber-800 font-medium mb-1">⚠️ No Auto-Refund on Dispute</div>
        <div className="text-[12px] text-amber-700">
          Unlike some escrow systems, BOND does not auto-refund after a timeout during dispute.
          The arbiter decides. This ensures real investigation happens, not just stalling.
        </div>
      </div>

      <H2>Arbiter Options</H2>
      <Table
        headers={['Option', 'When Used', 'Effect']}
        rows={[
          ['Release to Seller', 'Seller delivered properly', 'Seller gets price + collateral'],
          ['Refund to Buyer', 'Seller scammed or didn\'t deliver', 'Buyer gets price + collateral'],
          ['50/50 Split', 'Unclear fault, partial delivery', 'Seller gets half, buyer gets half + collateral'],
        ]}
      />
    </div>
  )
}

function Timers() {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Reference</div>
      <H1>Timers & Deadlines</H1>
      <P>
        BOND uses competitive timers to keep deals moving.
      </P>

      <Table
        headers={['Timer', 'Duration', 'What Happens']}
        rows={[
          ['Join Deadline', '1 hour', 'If nobody joins, room can be expired'],
          ['Fund Deadline', '30 minutes', 'After join, buyer must fund or room can be expired'],
          ['Deliver Deadline', '4 hours', 'After funded, seller must deliver or buyer can refund'],
          ['Auto-Release', '2 hours', 'After delivery, buyer must confirm or funds auto-release'],
        ]}
      />

      <H2>What "Can Be Expired" Means</H2>
      <P>
        After a timer passes, <strong className="text-stripe-navy dark:text-white">anyone</strong> can call <Code>expireRoom()</Code>.
        This is a cleanup mechanism — it frees up the active room slots for both parties.
      </P>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="text-[13px] text-blue-800 font-medium mb-1">💡 Tip</div>
        <div className="text-[12px] text-blue-700">
          Share the invite link with your counterparty immediately after creating a room.
          The 1-hour join timer starts at creation.
        </div>
      </div>
    </div>
  )
}

function Fees() {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Reference</div>
      <H1>Fees</H1>

      <Table
        headers={['Action', 'Fee']}
        rows={[
          ['Create room', 'FREE'],
          ['Join room', 'FREE'],
          ['Fund room', '1% of deal amount'],
          ['All other actions', 'FREE (gas only)'],
        ]}
      />

      <P>
        The 1% fee is calculated on the deal price and sent to the treasury when the buyer funds.
        For a 100 USDC deal, the buyer sends ~101 USDC total.
      </P>
      <P>
        There are no fees for creating, joining, delivering, confirming, disputing, or withdrawing.
        Only gas costs (which are the native USDC on Arc Testnet).
      </P>
    </div>
  )
}

function FAQ() {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Support</div>
      <H1>FAQ</H1>

      <div className="space-y-6">
        <FaqItem q="What if the seller never delivers?">
          If the seller doesn't mark as delivered within 4 hours, the buyer can call
          <Code>buyerRefund()</Code> and get their money back — plus the seller's collateral
          as a penalty. Sellers have a real incentive to follow through.
        </FaqItem>

        <FaqItem q="What if I send the wrong join code?">
          The join code is hashed on-chain. If it doesn't match, the other party can't join.
          You'll need to cancel and create a new room. Annoying, but that's the trade-off for security.
        </FaqItem>

        <FaqItem q="Can the arbiter steal my funds?">
          No. The arbiter address is set at deployment and can't be changed. They can only
          release to the seller, refund to the buyer, or split 50/50 — never to themselves or anywhere else.
        </FaqItem>

        <FaqItem q="Can we cancel after funding?">
          No. Once funded, the deal has to play out. This is intentional — it prevents either
          side from backing out at the last second (griefing). If both sides genuinely want out,
          they'd need to go through the arbiter.
        </FaqItem>

        <FaqItem q="How many rooms can I have at once?">
          Up to 3 active rooms per wallet. This is to prevent spam and keep things manageable.
        </FaqItem>

        <FaqItem q="Is collateral required?">
          No — it can be 0. But if you're dealing with someone you don't know,
          we'd recommend 10-50% of the deal value. It makes the seller think twice before scamming.
        </FaqItem>

        <FaqItem q="What chains are supported?">
          Right now, Arc Testnet only. The contract is written in Solidity 0.8.28 and could be
          deployed to any EVM chain — but that's not in scope for this version.
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

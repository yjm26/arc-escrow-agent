import { useParams, Link } from 'react-router-dom'

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'market', label: 'Market' },
  { id: 'collateral', label: 'Collateral' },
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

        {/* Mobile nav — full width, above content */}
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

        <div className="flex gap-8">
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

          {/* Content */}
          <div className="flex-1 min-w-0">
            {active === 'overview' && <Overview />}
            {active === 'how-it-works' && <HowItWorks />}
            {active === 'market' && <MarketDoc />}
            {active === 'collateral' && <Collateral />}
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
  return <h1 className="text-[28px] font-light text-stripe-navy dark:text-white mb-2" style={{ letterSpacing: '-0.56px' }}>{children}</h1>
}

function H2({ children }) {
  return <h2 className="text-[18px] font-semibold text-stripe-navy dark:text-white mt-8 mb-3">{children}</h2>
}

function H3({ children }) {
  return <h3 className="text-[15px] font-semibold text-stripe-navy dark:text-white mt-6 mb-2">{children}</h3>
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

function Overview() {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Overview</div>
      <H1>What is BOND</H1>
      <P>
        BOND is a trustless escrow protocol built on Arc Testnet. It lets two people who don't know or trust each other 
        make a deal safely — funds are locked in a smart contract and only released when both sides agree, or when an 
        arbiter makes a decision.
      </P>
      <P>
        The idea came from watching the same problem repeat across Telegram groups and Discord servers: someone wants 
        to sell a whitelist spot, an account, or a service. The buyer doesn't want to send money first. The seller 
        doesn't want to hand over the goods first. Both sides are stuck.
      </P>
      <P>
        BOND removes that deadlock. Neither side has to trust the other. They both trust the code.
      </P>

      <H2>What Problem It Solves</H2>
      <P>
        Every over-the-counter (OTC) deal faces the same chicken-and-egg problem. Traditional escrow services charge 
        5–15% and require you to trust a company with your money. BOND replaces that with a smart contract that holds 
        funds automatically, charges 1%, and can be verified by anyone.
      </P>

      <H2>How It's Different</H2>
      <ul className="list-none space-y-3 mb-6">
        {[
          ['No accounts needed', 'Just connect your wallet. No sign-up, no KYC, no email.'],
          ['Transparent by design', 'Every rule is in the smart contract, visible on-chain. No hidden clauses.'],
          ['Collateral protects buyers', 'Sellers can lock their own funds as a guarantee. Scam and they lose it.'],
          ['Built for real deals', 'NFT whitelists, wallet transfers, account sales, freelance work — anything that needs trust.'],
          ['Self-enforcing timeouts', 'Timers keep deals moving. No one can stall indefinitely.'],
        ].map(([title, desc], i) => (
          <li key={i} className="flex gap-3 text-[14px]">
            <span className="text-stripe-navy dark:text-white font-medium shrink-0 mt-0.5">—</span>
            <div>
              <span className="text-stripe-navy dark:text-white font-medium">{title}</span>
              <span className="text-stripe-body dark:text-gray-400"> — {desc}</span>
            </div>
          </li>
        ))}
      </ul>

      <H2>Smart Contract</H2>
      <P>
        BondRoomV18 is deployed on Arc Testnet. The source code is on GitHub and the contract is verified 
        on the block explorer.
      </P>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-500">Address</span>
          <Code>0x019A88470A1989eE0b13f53b65C0Fe7194b219c0</Code>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-500">Network</span>
          <span className="text-[13px] text-stripe-navy dark:text-white">Arc Testnet</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-500">Token</span>
          <span className="text-[13px] text-stripe-navy dark:text-white">USDC (0xD4799E405aB5eC71E2acab8E0EAC76B13469cD56)</span>
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

      <H2>The Six States</H2>
      <Table
        headers={['State', 'Who Acts', 'What Happens']}
        rows={[
          [<><Badge color="slate">CREATED</Badge></>, 'Seller', 'Room is open. Waiting for buyer to join. 1-hour timer.'],
          [<><Badge color="purple">JOINED</Badge></>, 'Buyer', 'Buyer entered with the correct code. 30-minute timer to fund.'],
          [<><Badge color="amber">FUNDED</Badge></>, 'Buyer', 'USDC deposited. Seller must deliver within 4 hours.'],
          [<><Badge color="green">DELIVERED</Badge></>, 'Seller', 'Item marked delivered. Buyer confirms or disputes within 2 hours.'],
          [<><Badge color="blue">RELEASED</Badge></>, 'Auto / Buyer', 'Funds sent to seller. Deal complete.'],
          [<><Badge color="red">DISPUTED</Badge></>, 'Arbiter', 'Frozen. Arbiter decides: release, refund, or split.'],
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
        The seller shares the invite link with the buyer through any channel — Telegram, Discord, Twitter DM, 
        or even email. The join code is never exposed in the link; it's verified on-chain when the buyer joins.
      </P>

      <H3>2. Join the Room</H3>
      <P>
        The buyer opens the link, connects their wallet, and enters the join code. If the code matches 
        the hashed value stored in the contract, they become the official buyer. The room state changes 
        from CREATED to JOINED.
      </P>
      <InfoBox title="Join Timer" color="blue">
        The buyer has 1 hour from room creation to join. After that, anyone can call expireRoom() to close 
        it and return the seller's collateral.
      </InfoBox>

      <H3>3. Fund the Escrow</H3>
      <P>
        After joining, the buyer must deposit the full deal amount plus a 1% platform fee into the contract. 
        For a 500 USDC deal, the buyer sends 505 USDC. The 500 USDC is locked as escrow. The 5 USDC fee 
        goes to the treasury.
      </P>
      <P>
        Once funded, the room state changes to FUNDED. The seller now has a 4-hour window to deliver. 
        Neither side can withdraw unilaterally at this point.
      </P>
      <InfoBox title="Fund Timer" color="blue">
        The buyer has 30 minutes to fund after joining. If they don't, anyone can expire the room.
      </InfoBox>

      <H3>4. Seller Delivers</H3>
      <P>
        The seller completes whatever was agreed — sends the NFT, transfers the account, finishes the work — 
        then clicks "Mark as Delivered" in the app. They can attach an optional message or proof link.
      </P>
      <P>
        The room state changes to DELIVERED. This starts the 2-hour auto-release timer. The buyer must 
        check what they received and respond.
      </P>
      <InfoBox title="Delivery Timer" color="blue">
        The seller has 4 hours to mark as delivered after funding. If they don't, the buyer can call 
        buyerRefund() to get their money back plus the seller's collateral as compensation.
      </InfoBox>

      <H3>5. Buyer Responds</H3>
      <P>
        The buyer now has two options:
      </P>
      <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px] text-stripe-body dark:text-gray-400">
        <li>
          <strong className="text-stripe-navy dark:text-white">Confirm</strong> — Everything checks out. 
          Funds are released to the seller, collateral is returned, and the deal ends.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Dispute</strong> — Something went wrong. 
          Funds are frozen. The auto-release timer stops. The buyer opens a ticket in the BOND Discord 
          for arbiter review.
        </li>
      </ul>

      <H3>6. Auto-Release (Safety Net)</H3>
      <P>
        If the buyer doesn't confirm or dispute within 2 hours of delivery, funds automatically release 
        to the seller. This prevents buyers from holding funds hostage by simply doing nothing.
      </P>
      <P>
        The 2-hour window is long enough to verify most digital goods (check an NFT transfer, log into 
        an account, review work) but short enough that no one gets stuck waiting.
      </P>

      {/* Flow diagram */}
      <div className="border border-stripe-border dark:border-white/10 rounded-lg p-5 my-6 bg-stripe-surface dark:bg-white/5">
        <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-4 text-center">Normal Flow</div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-[12px] font-mono">
          <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-3 py-1.5 rounded">Create</span>
          <span className="text-stripe-body dark:text-gray-400">→</span>
          <span className="bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 px-3 py-1.5 rounded">Join</span>
          <span className="text-stripe-body dark:text-gray-400">→</span>
          <span className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-3 py-1.5 rounded">Fund</span>
          <span className="text-stripe-body dark:text-gray-400">→</span>
          <span className="bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20 px-3 py-1.5 rounded">Deliver</span>
          <span className="text-stripe-body dark:text-gray-400">→</span>
          <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1.5 rounded">Confirm → Release</span>
        </div>
        <div className="text-center text-stripe-body dark:text-gray-400 text-[12px] my-2">or</div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-[12px] font-mono">
          <span className="bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20 px-3 py-1.5 rounded">Deliver</span>
          <span className="text-stripe-body dark:text-gray-400">→</span>
          <span className="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20 px-3 py-1.5 rounded">Dispute</span>
          <span className="text-stripe-body dark:text-gray-400">→</span>
          <span className="bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 px-3 py-1.5 rounded">Discord Ticket → Arbiter</span>
        </div>
      </div>

      <H2>Cancellation (Before Funding)</H2>
      <P>
        Before the deal is funded, either side can walk away without penalty. The seller can cancel 
        the room, or the buyer can leave. In both cases, any collateral returns to the seller and 
        the room is closed. No fees are charged.
      </P>
      <P>
        This is useful when plans change, the buyer gets cold feet, or the seller realizes they 
        can't deliver after all.
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
        for escrow-enabled transactions — each listing is a pre-configured deal that opens a trustless 
        escrow room with one click.
      </P>
      <P>
        Unlike general-purpose marketplaces, BOND listings are tightly integrated with the escrow contract. 
        When a buyer clicks "Open Deal," the room is created automatically with the price, category, 
        and delivery timeline already filled in.
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
          ['Description', 'No', 'Details the buyer should know — condition, restrictions, etc. 500 characters max.'],
          ['Category', 'Yes', 'NFT, Wallet, Account, Service, or Other. Helps buyers filter.'],
          ['Price', 'Yes', 'Deal amount in USDC. Must be greater than 0.'],
          ['Collateral', 'No', 'Amount you lock as a guarantee. Defaults to 0.'],
          ['Delivery', 'Yes', 'How many days you need to deliver. 1 to 90 days.'],
          ['Social Contacts', 'No', 'Twitter, Telegram, or Discord for buyers to reach you.'],
        ]}
      />

      <H2>Buyer & Seller Listings</H2>
      <P>
        Most listings are from sellers offering something. But buyers can post too — for example, 
        "I want to buy a wallet with specific NFTs" or "Looking for a landing page designer." 
        When a seller sees a buyer listing, they click "Sell to Them" to open the deal.
      </P>
      <P>
        Buyer listings have a blue accent stripe. Seller listings have a gray one. This visual cue 
        helps you instantly know who is offering and who is seeking.
      </P>

      <H2>Contact Before You Commit</H2>
      <P>
        We strongly recommend chatting with the other party before opening a deal. Every listing 
        can include social media links — Twitter/X and Telegram are clickable, Discord shows the username.
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
        Collateral is the seller's own money that gets locked alongside the buyer's deposit. 
        It serves one purpose: to make scamming more expensive than delivering honestly. 
        If a seller takes the money and runs, they don't just keep the buyer's funds — they 
        lose their own collateral too.
      </P>

      <H2>How It Works</H2>
      <P>
        When creating a room, the seller can choose to lock any amount of USDC as collateral. 
        This is sent in the same transaction as the room creation. The contract holds it until 
        the deal resolves.
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
          [<><Badge color="amber">Cancel</Badge> Before funding</>, '—', '→ Returned to seller'],
          [<><Badge color="amber">Expire</Badge> No one joins or funds</>, '—', '→ Returned to seller'],
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
          <strong className="text-stripe-navy dark:text-white">Trusted counterparty</strong> — 0% to 5%. 
          You know them from a community or past deals.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Stranger, low risk</strong> — 5% to 15%. 
          Small amounts, reversible goods, or services with clear deliverables.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Stranger, high risk</strong> — 15% to 50%. 
          Wallet sales, expensive NFTs, or anything involving account credentials.
        </li>
      </ul>
      <P>
        Higher collateral makes buyers more likely to choose your listing. It also means more 
        of your own capital is at risk, so find a balance that makes sense for your situation.
      </P>

      <InfoBox title="Important" color="amber">
        Collateral is locked for the entire duration of the deal. If the buyer takes the full 
        4 hours to fund, then the full delivery window, your collateral is unavailable until 
        the deal resolves. Factor this into your capital planning.
      </InfoBox>
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
          ['Seller never delivers within 4 hours', 'Buyer', 'Full refund + collateral to buyer'],
          ['Buyer confirms receipt', 'Buyer', 'Funds + collateral released to seller'],
          ['Seller cancels before funding', 'Seller', 'Collateral returned, room closed'],
          ['Buyer leaves before funding', 'Buyer', 'Collateral returned, room closed'],
          ['No one joins within 1 hour', 'Anyone', 'Collateral returned, room expired'],
          ['Buyer never funds within 30 min', 'Anyone', 'Collateral returned, room expired'],
        ]}
      />

      <H2>When a Dispute Happens</H2>
      <P>
        A dispute is triggered when the buyer clicks "Dispute" after the seller marks delivery. 
        This freezes the funds immediately — the auto-release timer stops, and no one can touch 
        the money until the arbiter makes a decision.
      </P>

      <H3>The Dispute Process</H3>
      <ol className="list-decimal pl-6 space-y-3 mb-6 text-[14px] text-stripe-body dark:text-gray-400">
        <li>
          <strong className="text-stripe-navy dark:text-white">Buyer disputes</strong> — Clicking "Dispute" 
          in the room immediately freezes all funds and stops the auto-release timer.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Open a ticket</strong> — The buyer opens 
          a support ticket in the BOND Discord server. Include the room number and a brief description 
          of what went wrong.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Present evidence</strong> — Both parties 
          share screenshots, transaction hashes, chat logs, or any proof that supports their case. 
          The arbiter reviews everything before deciding.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Arbiter investigates</strong> — The arbiter 
          evaluates the evidence, asks follow-up questions if needed, and determines the fairest outcome.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">On-chain execution</strong> — The arbiter 
          calls one of three resolution functions on the contract. The result is immediate and irreversible.
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
        The arbiter address is hardcoded at contract deployment and cannot be changed. They can only 
        execute the three predefined resolutions — they cannot steal funds, send money to a third party, 
        or modify the deal terms. Their power is strictly bounded by the contract code.
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
        BOND uses timeouts to keep deals moving and prevent either side from stalling indefinitely. 
        Every timer is enforced on-chain by the smart contract — no one can override or extend them.
      </P>

      <Table
        headers={['Phase', 'Duration', 'What Triggers It', 'What Happens If Expired']}
        rows={[
          ['Join', '1 hour', 'Room is created', 'Anyone can expire the room; collateral returns to seller'],
          ['Fund', '30 minutes', 'Buyer joins the room', 'Anyone can expire the room; collateral returns to seller'],
          ['Deliver', '4 hours', 'Buyer funds the escrow', 'Buyer can call buyerRefund() for full refund + collateral'],
          ['Auto-Release', '2 hours', 'Seller marks as delivered', 'Funds automatically release to seller'],
          ['Dispute Arbiter', 'No timeout', 'Buyer clicks Dispute', 'Frozen until arbiter resolves'],
        ]}
      />

      <H2>Who Can Call expireRoom()?</H2>
      <P>
        After a timer expires, <strong className="text-stripe-navy dark:text-white">anyone</strong> can 
        call <Code>expireRoom()</Code> to close the room and return collateral. This is intentional — 
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
          <strong className="text-stripe-navy dark:text-white">Share the invite link immediately</strong> — 
          The 1-hour join timer starts when you create the room, not when you send the link.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Fund promptly after joining</strong> — 
          30 minutes is generous, but don't cut it close if you're serious about the deal.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Set realistic delivery days</strong> — 
          The Market lets you specify up to 90 days, but the on-chain timer is always 4 hours for 
          marking delivery. Use the delivery days field to communicate realistic timelines to buyers.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Check delivery within 2 hours</strong> — 
          Once the seller marks delivered, you have 2 hours to verify and respond. Set a reminder.
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
        (minus nothing) upon release. Collateral is never touched by fees — it always goes back 
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
          <strong className="text-stripe-navy dark:text-white">Funds are locked</strong> — Once deposited, 
          USDC sits in the contract. Neither the buyer nor the seller can withdraw it unilaterally.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">No admin withdrawal</strong> — The contract 
          owner cannot drain funds. The only way money leaves is through the defined resolution paths.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Arbiter is bounded</strong> — The arbiter 
          can only call three functions: release to seller, refund to buyer, or 50/50 split. They cannot 
          send funds to themselves or any other address.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">State machine is strict</strong> — Every 
          action checks the current room state. You can't fund a room that's already funded, or dispute 
          a room that hasn't been delivered.
        </li>
        <li>
          <strong className="text-stripe-navy dark:text-white">Join codes are hashed</strong> — The actual 
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
        wallet (MetaMask or any WalletConnect-compatible wallet). The app is a pure frontend — it 
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
          If the seller doesn't mark delivery within 4 hours of funding, the buyer can call 
          <Code>buyerRefund()</Code> at any time. The buyer gets their full payment back, plus 
          the seller's collateral as compensation. This is automatic — no arbiter needed.
        </FaqItem>

        <FaqItem q="Can I cancel after funding?">
          No. Once the escrow is funded, the deal must play out through the normal flow or dispute 
          process. This is intentional — it prevents either side from backing out at the last second 
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
          After the seller marks delivery, the buyer has 2 hours to confirm or dispute. If they do 
          nothing, funds automatically release to the seller. This prevents buyers from holding funds 
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

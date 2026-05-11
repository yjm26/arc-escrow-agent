import { useState } from 'react'
import { ethers } from 'ethers'
import { DEAL_STATUS, DEAL_BADGE } from '../../lib/contract'

const TABS = [
  { key: 'fund', label: 'Fund' },
  { key: 'approve', label: 'Release' },
  { key: 'refund', label: 'Refund' },
  { key: 'view', label: 'View' },
]

export default function ManageDeal({ escrow, token, signerAddress }) {
  const [dealId, setDealId] = useState('')
  const [activeTab, setActiveTab] = useState('fund')
  const [status, setStatus] = useState(null)
  const [deal, setDeal] = useState(null)

  const ESCROW_ADDR = escrow.target || escrow.address

  async function run() {
    if (dealId === '') {
      setStatus({ type: 'err', msg: 'Enter a deal ID' })
      return
    }
    try {
      if (activeTab === 'fund') {
        setStatus({ type: 'info', msg: 'Checking allowance…' })
        const d = await escrow.getDeal(dealId)
        const allowance = await token.allowance(signerAddress, ESCROW_ADDR)
        if (allowance < d[2]) {
          setStatus({ type: 'info', msg: 'Approving USDC…' })
          await (await token.approve(ESCROW_ADDR, d[2])).wait()
        }
        setStatus({ type: 'info', msg: 'Funding…' })
        await (await escrow.fundDeal(dealId)).wait()
        setStatus({ type: 'ok', msg: `Deal #${dealId} funded ✓` })
      } else if (activeTab === 'approve') {
        setStatus({ type: 'info', msg: 'Releasing…' })
        await (await escrow.approveDeal(dealId)).wait()
        setStatus({ type: 'ok', msg: 'Released ✓' })
      } else if (activeTab === 'refund') {
        setStatus({ type: 'info', msg: 'Refunding…' })
        await (await escrow.refundDeal(dealId)).wait()
        setStatus({ type: 'ok', msg: 'Refunded ✓' })
      } else {
        const d = await escrow.getDeal(dealId)
        setDeal({
          client: d[0],
          freelancer: d[1],
          amount: d[2],
          status: d[3],
          description: d[4],
        })
        setStatus({ type: 'ok', msg: 'Loaded ✓' })
      }
    } catch (e) {
      setStatus({ type: 'err', msg: e.reason || e.message })
    }
  }

  return (
    <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-dark-muted mb-4">
        Manage Deal
      </div>

      <input
        className="w-full px-4 py-3 bg-dark border border-dark-border rounded-xl text-white text-sm placeholder:text-[#333] outline-none focus:border-accent transition-colors mb-3"
        type="number"
        placeholder="Deal ID"
        value={dealId}
        onChange={(e) => setDealId(e.target.value)}
      />

      <div className="flex gap-1.5 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
              activeTab === t.key
                ? 'bg-accent text-white border-accent'
                : 'bg-[#1a1a1a] text-[#666] border-dark-border hover:border-[#444] hover:text-[#aaa]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <button
        onClick={run}
        className="w-full bg-accent text-white py-3 rounded-xl text-sm font-semibold hover:opacity-90 hover:-translate-y-px transition-all"
      >
        {TABS.find((t) => t.key === activeTab)?.label} Deal
      </button>

      {status && (
        <div
          className={`mt-3 px-4 py-2.5 rounded-xl text-sm font-medium ${
            status.type === 'ok'
              ? 'bg-green/10 text-green'
              : status.type === 'err'
              ? 'bg-red/10 text-red'
              : 'bg-accent/10 text-accent'
          }`}
        >
          {status.msg}
        </div>
      )}

      {deal && (
        <div className="mt-4 bg-dark border border-dark-border rounded-xl p-4">
          <div className="font-mono text-[10px] uppercase tracking-[2px] text-dark-muted mb-3">
            Deal Details
          </div>
          <DealRow label="ID" value={`#${dealId}`} />
          <DealRow
            label="Status"
            value={
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider ${DEAL_BADGE[DEAL_STATUS[deal.status]]}`}>
                {DEAL_STATUS[deal.status]}
              </span>
            }
          />
          <DealRow label="Description" value={deal.description} />
          <DealRow label="Amount" value={`${ethers.formatUnits(deal.amount, 6)} USDC`} />
          <DealRow label="Client" value={<span className="text-[11px]">{deal.client}</span>} />
          <DealRow label="Freelancer" value={<span className="text-[11px]">{deal.freelancer}</span>} />
        </div>
      )}
    </div>
  )
}

function DealRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#1a1a1a] last:border-b-0">
      <span className="text-[#555] text-[11px] uppercase tracking-wider">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  )
}

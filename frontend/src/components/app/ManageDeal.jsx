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
        setStatus({ type: 'ok', msg: `Deal #${dealId} funded` })
      } else if (activeTab === 'approve') {
        setStatus({ type: 'info', msg: 'Releasing…' })
        await (await escrow.approveDeal(dealId)).wait()
        setStatus({ type: 'ok', msg: 'Released' })
      } else if (activeTab === 'refund') {
        setStatus({ type: 'info', msg: 'Refunding…' })
        await (await escrow.refundDeal(dealId)).wait()
        setStatus({ type: 'ok', msg: 'Refunded' })
      } else {
        const d = await escrow.getDeal(dealId)
        setDeal({
          client: d[0],
          freelancer: d[1],
          amount: d[2],
          status: d[3],
          description: d[4],
        })
        setStatus({ type: 'ok', msg: 'Loaded' })
      }
    } catch (e) {
      setStatus({ type: 'err', msg: e.reason || e.message })
    }
  }

  return (
    <div className="card-3d p-6">
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body mb-5">
        Manage Deal
      </div>

      <input
        className="stripe-input mb-4"
        type="number"
        placeholder="Deal ID"
        value={dealId}
        onChange={(e) => setDealId(e.target.value)}
      />

      <div className="flex gap-2 mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`tab-btn flex-1 ${activeTab === t.key ? 'active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <button onClick={run} className="btn-primary w-full py-3">
        {TABS.find((t) => t.key === activeTab)?.label} Deal
      </button>

      {status && (
        <div className={`mt-3 px-4 py-2.5 rounded text-[13px] font-medium border ${
          status.type === 'ok'
            ? 'bg-green-50 text-green-700 border-green-100'
            : status.type === 'err'
            ? 'bg-red-50 text-red-600 border-red-100'
            : 'bg-blue-50 text-blue-700 border-blue-100'
        }`} style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          {status.msg}
        </div>
      )}

      {deal && (
        <div className="mt-5 bg-stripe-surface border border-stripe-border rounded-lg p-5" style={{ boxShadow: '0 2px 8px rgba(50,50,93,0.06)' }}>
          <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body mb-4">
            Deal Details
          </div>
          <DealRow label="ID" value={`#${dealId}`} />
          <DealRow
            label="Status"
            value={
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-semibold tracking-wider ${DEAL_BADGE[DEAL_STATUS[deal.status]]}`}>
                {DEAL_STATUS[deal.status]}
              </span>
            }
          />
          <DealRow label="Description" value={deal.description} />
          <DealRow label="Amount" value={`${ethers.formatUnits(deal.amount, 6)} USDC`} />
          <DealRow label="Client" value={<span className="font-mono text-[11px]">{deal.client}</span>} />
          <DealRow label="Freelancer" value={<span className="font-mono text-[11px]">{deal.freelancer}</span>} />
        </div>
      )}
    </div>
  )
}

function DealRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-stripe-border last:border-b-0">
      <span className="text-[11px] uppercase tracking-wider text-stripe-body font-mono">{label}</span>
      <span className="text-[14px] text-stripe-navy font-light">{value}</span>
    </div>
  )
}

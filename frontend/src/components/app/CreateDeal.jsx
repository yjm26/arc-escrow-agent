import { useState } from 'react'
import { ethers } from 'ethers'

export default function CreateDeal({ escrow, onCreated }) {
  const [freelancer, setFreelancer] = useState('')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [status, setStatus] = useState(null)

  async function handleCreate() {
    if (!freelancer || !amount || !desc) {
      setStatus({ type: 'err', msg: 'Fill all fields' })
      return
    }
    try {
      setStatus({ type: 'info', msg: 'Creating deal…' })
      const tx = await escrow.createDeal(freelancer, ethers.parseUnits(amount, 6), desc)
      const receipt = await tx.wait()
      const event = receipt.logs.find((l) => l.fragment?.name === 'DealCreated')
      const id = event ? event.args[0].toString() : '?'
      setStatus({ type: 'ok', msg: `Deal #${id} created` })
      onCreated?.(id)
      setFreelancer('')
      setAmount('')
      setDesc('')
    } catch (e) {
      setStatus({ type: 'err', msg: e.reason || e.message })
    }
  }

  return (
    <div className="card-3d p-6">
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body mb-5">
        New Deal
      </div>

      <input
        className="stripe-input mb-3"
        placeholder="Freelancer address (0x...)"
        value={freelancer}
        onChange={(e) => setFreelancer(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3 mb-3">
        <input
          className="stripe-input"
          type="number"
          placeholder="Amount (USDC)"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          className="stripe-input"
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>

      <button onClick={handleCreate} className="btn-primary w-full py-3 mt-1">
        Create Deal
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
    </div>
  )
}

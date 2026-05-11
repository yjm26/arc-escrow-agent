import { useState } from 'react'
import { ethers } from 'ethers'

export default function CreateDeal({ escrow, onCreated }) {
  const [freelancer, setFreelancer] = useState('')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [status, setStatus] = useState(null) // { type: 'ok'|'err'|'info', msg }

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
      setStatus({ type: 'ok', msg: `Deal #${id} created ✓` })
      onCreated?.(id)
      setFreelancer('')
      setAmount('')
      setDesc('')
    } catch (e) {
      setStatus({ type: 'err', msg: e.reason || e.message })
    }
  }

  return (
    <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-dark-muted mb-4">
        New Deal
      </div>

      <input
        className="w-full px-4 py-3 bg-dark border border-dark-border rounded-xl text-white text-sm placeholder:text-[#333] outline-none focus:border-accent transition-colors mb-2.5"
        placeholder="Freelancer address (0x...)"
        value={freelancer}
        onChange={(e) => setFreelancer(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        <input
          className="w-full px-4 py-3 bg-dark border border-dark-border rounded-xl text-white text-sm placeholder:text-[#333] outline-none focus:border-accent transition-colors"
          type="number"
          placeholder="Amount (USDC)"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          className="w-full px-4 py-3 bg-dark border border-dark-border rounded-xl text-white text-sm placeholder:text-[#333] outline-none focus:border-accent transition-colors"
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>

      <button
        onClick={handleCreate}
        className="w-full bg-accent text-white py-3 rounded-xl text-sm font-semibold hover:opacity-90 hover:-translate-y-px transition-all mt-2"
      >
        Create Deal
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
    </div>
  )
}

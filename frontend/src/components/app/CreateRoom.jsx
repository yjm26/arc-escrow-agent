import { useState } from 'react'
import { ethers } from 'ethers'

export default function CreateRoom({ room, token, signerAddress }) {
  const [item, setItem] = useState('')
  const [price, setPrice] = useState('')
  const [isSeller, setIsSeller] = useState(true)
  const [status, setStatus] = useState(null)
  const [roomId, setRoomId] = useState(null)
  const [step, setStep] = useState(0) // 0=idle, 1=approving, 2=creating

  const CREATION_FEE = 0.1
  const DELIVERY_FEE = 0.1
  const tax = price ? (parseFloat(price) * 0.01).toFixed(2) : '0'
  const total = price ? (parseFloat(price) + parseFloat(tax)).toFixed(2) : '0'

  const ROOM_ADDR = room.target || room.address

  async function handleCreate() {
    if (!item || !price || parseFloat(price) <= 0) {
      setStatus({ type: 'err', msg: 'Fill item and price' })
      return
    }

    try {
      // ─── Step 1: Check USDC balance ───
      setStatus({ type: 'info', msg: 'Checking USDC balance…' })
      setStep(0)
      const feeWei = ethers.parseUnits(String(CREATION_FEE + DELIVERY_FEE), 6)
      const balance = await token.balanceOf(signerAddress)
      console.log('USDC balance:', ethers.formatUnits(balance, 6))

      if (balance < feeWei) {
        setStatus({ type: 'err', msg: `Need ${CREATION_FEE + DELIVERY_FEE} USDC for fees. Balance: ${ethers.formatUnits(balance, 6)} USDC` })
        return
      }

      // ─── Step 2: Approve USDC ───
      setStep(1)
      const allowance = await token.allowance(signerAddress, ROOM_ADDR)
      console.log('Current allowance:', ethers.formatUnits(allowance, 6))

      if (allowance < feeWei) {
        setStatus({ type: 'info', msg: 'Step 1/2: Approve USDC in wallet…' })
        console.log('Sending approve tx to:', ROOM_ADDR, 'amount:', feeWei.toString())
        const approveTx = await token.approve(ROOM_ADDR, feeWei)
        console.log('Approve tx hash:', approveTx.hash)
        setStatus({ type: 'info', msg: 'Waiting for approval confirmation…' })
        const approveReceipt = await approveTx.wait()
        console.log('Approve confirmed, block:', approveReceipt.blockNumber)

        // Small delay to let state update
        await new Promise(r => setTimeout(r, 1000))
      } else {
        console.log('Allowance sufficient, skipping approve')
      }

      // ─── Step 3: Verify allowance ───
      const newAllowance = await token.allowance(signerAddress, ROOM_ADDR)
      console.log('New allowance:', ethers.formatUnits(newAllowance, 6))
      if (newAllowance < feeWei) {
        setStatus({ type: 'err', msg: 'Approval failed — allowance still too low. Try again.' })
        setStep(0)
        return
      }

      // ─── Step 4: Create Room ───
      setStep(2)
      setStatus({ type: 'info', msg: 'Step 2/2: Create room in wallet…' })
      const priceWei = ethers.parseUnits(price, 6)
      console.log('Calling createRoom:', item, priceWei.toString(), isSeller)
      const createTx = await room.createRoom(item, priceWei, isSeller)
      console.log('Create tx hash:', createTx.hash)
      setStatus({ type: 'info', msg: 'Waiting for room creation…' })
      const createReceipt = await createTx.wait()
      console.log('Create confirmed, block:', createReceipt.blockNumber)

      // Parse event
      let id = '?'
      for (const log of createReceipt.logs) {
        try {
          const parsed = room.interface.parseLog(log)
          if (parsed?.name === 'RoomCreated') {
            id = parsed.args[0].toString()
            break
          }
        } catch {}
      }

      setRoomId(id)
      setStatus({ type: 'ok', msg: `Room #${id} created!` })
      setStep(0)
      setItem('')
      setPrice('')

    } catch (e) {
      console.error('Create room error:', e)
      const msg = e.reason || e.shortMessage || e.message || 'Unknown error'
      setStatus({ type: 'err', msg: `Error: ${msg}` })
      setStep(0)
    }
  }

  function copyLink() {
    const link = `${window.location.origin}/room/${roomId}`
    navigator.clipboard.writeText(link)
    setStatus({ type: 'ok', msg: 'Link copied!' })
  }

  if (roomId) {
    return (
      <div className="card-3d p-6">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-lg bg-stripe-surface border border-stripe-border flex items-center justify-center" style={{ boxShadow: '0 4px 12px rgba(50,50,93,0.1)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4" stroke="#108c3d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="9" stroke="#108c3d" strokeWidth="1.5"/>
            </svg>
          </div>
          <h3 className="text-[20px] font-light text-stripe-navy mb-2">Room #{roomId} ready</h3>
          <p className="text-[14px] text-stripe-body mb-6">
            Share this link with your {isSeller ? 'buyer' : 'seller'}:
          </p>
          <div className="bg-stripe-surface border border-stripe-border rounded p-3 mb-4 font-mono text-[12px] text-stripe-body break-all">
            {window.location.origin}/room/{roomId}
          </div>
          <button onClick={copyLink} className="btn-primary w-full py-3 mb-3">Copy Invite Link</button>
          <a href={`/room/${roomId}`} className="btn-ghost w-full block text-center py-3">View Room →</a>
        </div>
      </div>
    )
  }

  return (
    <div className="card-3d p-6">
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body mb-5">New Room</div>

      {/* Role selector */}
      <div className="mb-4">
        <label className="text-[13px] text-stripe-body mb-2 block">I am the…</label>
        <div className="flex gap-2">
          <button onClick={() => setIsSeller(true)} className={`tab-btn flex-1 ${isSeller ? 'active' : ''}`}>Seller</button>
          <button onClick={() => setIsSeller(false)} className={`tab-btn flex-1 ${!isSeller ? 'active' : ''}`}>Buyer</button>
        </div>
      </div>

      <input
        className="stripe-input mb-3"
        placeholder={isSeller ? "What are you selling? (e.g. iPhone 15 Pro)" : "What are you buying? (e.g. Website redesign)"}
        value={item}
        onChange={(e) => setItem(e.target.value)}
      />

      <input
        className="stripe-input mb-4"
        type="number"
        placeholder="Price (USDC)"
        min="0.01"
        step="0.01"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />

      {/* Price breakdown */}
      {price && parseFloat(price) > 0 && (
        <div className="bg-stripe-surface border border-stripe-border rounded p-4 mb-5" style={{ boxShadow: '0 2px 6px rgba(50,50,93,0.06)' }}>
          <div className="flex justify-between text-[13px] py-1.5 border-b border-stripe-border">
            <span className="text-stripe-body">Item price</span>
            <span className="text-stripe-navy font-mono" style={{ fontFeatureSettings: '"tnum"' }}>{price} USDC</span>
          </div>
          <div className="flex justify-between text-[13px] py-1.5 border-b border-stripe-border">
            <span className="text-stripe-body">Tax (1%)</span>
            <span className="text-stripe-navy font-mono" style={{ fontFeatureSettings: '"tnum"' }}>{tax} USDC</span>
          </div>
          <div className="flex justify-between text-[14px] py-1.5 font-medium">
            <span className="text-stripe-navy">Buyer pays</span>
            <span className="text-stripe-navy font-mono" style={{ fontFeatureSettings: '"tnum"' }}>{total} USDC</span>
          </div>
          <div className="mt-2 pt-2 border-t border-stripe-border">
            <div className="flex justify-between text-[11px] py-1 text-stripe-body">
              <span>Creation fee (you)</span>
              <span className="font-mono">−{CREATION_FEE} USDC</span>
            </div>
            <div className="flex justify-between text-[11px] py-1 text-stripe-body">
              <span>Delivery fee (buyer)</span>
              <span className="font-mono">−{DELIVERY_FEE} USDC</span>
            </div>
          </div>
        </div>
      )}

      {/* Step indicator */}
      {step > 0 && (
        <div className="flex gap-2 mb-4">
          <div className={`flex-1 text-center py-2 rounded text-[12px] font-medium ${step === 1 ? 'bg-stripe-navy text-white' : 'bg-green-50 text-green-700'}`}>
            {step > 1 ? '✓' : '1/2'} Approve
          </div>
          <div className={`flex-1 text-center py-2 rounded text-[12px] font-medium ${step === 2 ? 'bg-stripe-navy text-white' : step > 2 ? 'bg-green-50 text-green-700' : 'bg-stripe-surface text-stripe-body border border-stripe-border'}`}>
            {step > 2 ? '✓' : '2/2'} Create
          </div>
        </div>
      )}

      <button onClick={handleCreate} disabled={step > 0} className="btn-primary w-full py-3 disabled:opacity-50">
        {step > 0 ? 'Processing…' : 'Create Room'}
      </button>

      {status && (
        <div className={`mt-3 px-4 py-2.5 rounded text-[13px] font-medium border ${
          status.type === 'ok' ? 'bg-green-50 text-green-700 border-green-100'
          : status.type === 'err' ? 'bg-red-50 text-red-600 border-red-100'
          : 'bg-blue-50 text-blue-700 border-blue-100'
        }`}>
          {status.msg}
        </div>
      )}
    </div>
  )
}

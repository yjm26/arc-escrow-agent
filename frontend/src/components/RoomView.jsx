import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'
import { getContract, getUsdc, waitForTx, ensureArcChain, ARC_GAS, ARC_GAS_APPROVE, STATE_NAMES, CONTRACT_ADDRESS } from '../utils/contract'
import { fetchReputation, getReputationBadge, getCollateralBadge } from '../utils/reputation'

const STATE_BADGE = {
  Created: 'text-blue-700 bg-blue-50 border-blue-200',
  Joined: 'text-purple-700 bg-purple-50 border-purple-200',
  Funded: 'text-amber-700 bg-amber-50 border-amber-200',
  Delivered: 'text-green-700 bg-green-50 border-green-200',
  Released: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  Disputed: 'text-red-700 bg-red-50 border-red-200',
  Refunded: 'text-orange-700 bg-orange-50 border-orange-200',
  Expired: 'text-gray-600 bg-gray-50 border-gray-200',
  Cancelled: 'text-gray-600 bg-gray-50 border-gray-200',
}

const TREASURY = '0xB8b4e8E7Ad2651d36b8E0D24B5EF1ae06EE2cC4a'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://bond-market-backend-production.up.railway.app'

function formatAddress(addr) {
  if (!addr || addr === '0x0000000000000000000000000000000000000000') return '—'
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export default function RoomView({ wallet }) {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const joinCode = searchParams.get('code') || ''

  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null)
  const [countdown, setCountdown] = useState('')
  const [arbiterName, setArbiterName] = useState('Bond Escrow')
  const [arbiterAddr, setArbiterAddr] = useState(TREASURY)
  const [copied, setCopied] = useState(false)
  const [ownerAddr, setOwnerAddr] = useState('')

  // Reputation state
  const [creatorRep, setCreatorRep] = useState(null)
  const [counterpartyRep, setCounterpartyRep] = useState(null)

  // Evidence state
  const [evidence, setEvidence] = useState([])
  const [disputeReason, setDisputeReason] = useState('')
  const [evidenceType, setEvidenceType] = useState('link')
  const [evidenceDesc, setEvidenceDesc] = useState('')
  const [evidenceRef, setEvidenceRef] = useState('')
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [showEvidenceForm, setShowEvidenceForm] = useState(false)

  const account = wallet?.address?.toLowerCase()

  async function loadRoom() {
    try {
      if (!wallet) { setLoading(false); return }
      const provider = wallet.provider
      const contract = getContract(provider)
      const data = await contract.getRoom(id)
      setRoom({
        creator: data.creator,
        counterparty: data.counterparty,
        item: data.itemDescription,
        price: ethers.formatUnits(data.priceUSD, 6),
        collateralAmount: ethers.formatUnits(data.collateralAmount, 6),
        createdAt: Number(data.createdAt),
        joinedAt: Number(data.joinedAt),
        deliveredAt: Number(data.deliveredAt),
        disputedAt: Number(data.disputedAt),
        state: STATE_NAMES[Number(data.state)],
        value: ethers.formatUnits(data.fundedAmount, 6),
        collateralLocked: data.collateralAmount,
        creatorIsSeller: data.creatorIsSeller,
      })
      try { setArbiterName(await contract.arbiterName()) } catch {}
      try { setArbiterAddr(await contract.arbiter()) } catch {}
      try { setOwnerAddr(await contract.owner()) } catch {}
      // Fetch reputation for both parties
      try {
        const [cRep, cpRep] = await Promise.all([
          fetchReputation(provider, data.creator),
          fetchReputation(provider, data.counterparty),
        ])
        setCreatorRep(cRep)
        setCounterpartyRep(cpRep)
      } catch {}
    } catch (err) {
      console.error(err)
      setStatus({ type: 'err', msg: 'Room not found' })
    } finally { setLoading(false) }
  }

  async function loadEvidence() {
    try {
      if (!wallet || !id) return
      const provider = wallet.provider
      const contract = getContract(provider)
      // Try on-chain first
      const chainEvidence = await contract.getAllEvidence(id)
      const formatted = chainEvidence.map((e, i) => ({
        id: `chain-${i}`,
        submitter: e.submitter,
        evidenceType: e.evidenceType,
        description: e.description,
        evidenceRef: e.evidenceRef,
        timestamp: Number(e.timestamp) * 1000,
        source: 'chain',
      }))
      // Also fetch from backend (for any off-chain extras)
      const res = await fetch(`${BACKEND_URL}/api/evidence/${id}`)
      const backendEvidence = res.ok ? await res.json() : []
      const backendFormatted = backendEvidence.map(e => ({
        ...e,
        id: `backend-${e.id}`,
        source: 'backend',
      }))
      // Merge and dedupe by evidenceRef
      const seen = new Set()
      const merged = [...formatted, ...backendFormatted].filter(e => {
        if (seen.has(e.evidenceRef)) return false
        seen.add(e.evidenceRef)
        return true
      })
      setEvidence(merged)
    } catch (err) {
      console.error('loadEvidence error:', err)
    }
  }

  useEffect(() => { loadRoom(); loadEvidence() }, [id, wallet])

  useEffect(() => {
    if (!wallet) return
    const interval = setInterval(() => { loadRoom(); loadEvidence() }, 10000)
    return () => clearInterval(interval)
  }, [id, wallet])

  useEffect(() => {
    if (!room || room.state !== 'Delivered' || !room.deliveredAt) return
    const AUTO_RELEASE = 2 * 3600
    const interval = setInterval(() => {
      const remaining = (room.deliveredAt + AUTO_RELEASE) - Math.floor(Date.now() / 1000)
      if (remaining <= 0) { setCountdown('Ready for auto-release!'); clearInterval(interval); return }
      const h = Math.floor(remaining / 3600)
      const m = Math.floor((remaining % 3600) / 60)
      const s = remaining % 60
      setCountdown(`${h}h ${m}m ${s}s`)
    }, 1000)
    return () => clearInterval(interval)
  }, [room?.state, room?.deliveredAt])

  const isCreator = account === room?.creator?.toLowerCase()
  const isCounter = account === room?.counterparty?.toLowerCase()
  const isParticipant = isCreator || isCounter
  const isAdmin = account === ownerAddr?.toLowerCase() || account === arbiterAddr?.toLowerCase()

  async function doAction(fn, label, successMsg) {
    setStatus({ type: 'info', msg: label })
    try {
      const signer = await wallet.provider.getSigner()
      await ensureArcChain(signer)
      const contract = getContract(signer)
      const tx = await fn(contract)
      console.log('TX sent:', tx.hash)
      setStatus({ type: 'info', msg: `TX sent: ${tx.hash.slice(0, 10)}… — waiting for confirmation…` })
      const receipt = await Promise.race([
        tx.wait(1),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TX timeout — check https://testnet.arcscan.app/tx/' + tx.hash)), 120000))
      ])
      console.log('TX confirmed in block:', receipt.blockNumber, 'status:', receipt.status)
      if (receipt.status === 0) {
        setStatus({ type: 'err', msg: 'TX reverted on-chain' })
      } else {
        setStatus({ type: 'ok', msg: successMsg })
        loadRoom()
        loadEvidence()
      }
    } catch (err) {
      console.error('TX failed:', err)
      setStatus({ type: 'err', msg: err.reason || err.message })
    }
  }

  const handleJoin = async () => {
    if (!joinCode) { setStatus({ type: 'err', msg: 'Invite link missing join code' }); return }
    try {
      const signer = await wallet.provider.getSigner()
      const contract = getContract(signer)

      if (!room.creatorIsSeller && room.collateralAmount && ethers.parseUnits(room.collateralAmount, 6) > 0n) {
        const collateralWei = ethers.parseUnits(room.collateralAmount, 6)
        const usdc = getUsdc(signer)
        setStatus({ type: 'info', msg: 'Approving collateral…' })
        const approveTx = await usdc.approve(CONTRACT_ADDRESS, collateralWei, ARC_GAS_APPROVE)
        await approveTx.wait(1, 180000)
      }

      setStatus({ type: 'info', msg: 'Joining…' })
      const tx = await contract.joinRoom(id, ethers.toUtf8Bytes(joinCode), ARC_GAS)
      await tx.wait(1, 180000)
      setStatus({ type: 'ok', msg: 'Joined!' })
      loadRoom()
    } catch (e) {
      setStatus({ type: 'err', msg: e.reason || e.message })
    }
  }
  const handleFund = async () => {
    const BPS = 10000n
    const TAX = 100n
    const priceWei = ethers.parseUnits(room.price, 6)
    const exactNeeded = (priceWei * BPS) / (BPS - TAX)
    try {
      const signer = await wallet.provider.getSigner()
      const contract = getContract(signer)
      const usdc = getUsdc(signer)

      setStatus({ type: 'info', msg: 'Approving USDC…' })
      const approveTx = await usdc.approve(CONTRACT_ADDRESS, exactNeeded, ARC_GAS_APPROVE)
      await approveTx.wait(1, 180000)

      setStatus({ type: 'info', msg: 'Funding room…' })
      const fundTx = await contract.fundRoom(id, ARC_GAS)
      await fundTx.wait(1, 180000)
      setStatus({ type: 'ok', msg: 'Funded!' })
      loadRoom()
    } catch (e) {
      setStatus({ type: 'err', msg: e.reason || e.message })
    }
  }
  const handleDeliver = () => doAction((c) => c.markDelivered(id, ethers.ZeroHash, ARC_GAS), 'Confirming item given…', 'Delivered!')
  const handleRelease = () => doAction((c) => c.releaseFunds(id, ARC_GAS), 'Confirming receipt…', 'Released! Seller gets price + collateral.')

  const handleDispute = async () => {
    if (!disputeReason.trim()) { setStatus({ type: 'err', msg: 'Reason required' }); return }
    if (!evidenceRef.trim()) { setStatus({ type: 'err', msg: 'Evidence required — paste a link or description' }); return }
    await doAction(
      (c) => c.openDispute(id, disputeReason, evidenceType, evidenceDesc, evidenceRef, ARC_GAS),
      'Opening dispute with evidence…',
      'Disputed! Evidence recorded on-chain.'
    )
    setShowDisputeForm(false)
    setDisputeReason('')
    setEvidenceDesc('')
    setEvidenceRef('')
  }

  const handleSubmitEvidence = async () => {
    if (!evidenceRef.trim()) { setStatus({ type: 'err', msg: 'Evidence required' }); return }
    await doAction(
      (c) => c.submitEvidence(id, evidenceType, evidenceDesc, evidenceRef, ARC_GAS),
      'Submitting evidence…',
      'Evidence submitted!'
    )
    // Also store in backend for redundancy
    try {
      await fetch(`${BACKEND_URL}/api/evidence/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submitter: account,
          evidenceType,
          description: evidenceDesc,
          evidenceRef,
        }),
      })
    } catch {}
    setShowEvidenceForm(false)
    setEvidenceDesc('')
    setEvidenceRef('')
  }

  const handleCancel = () => doAction((c) => c.cancelRoom(id, ARC_GAS), 'Cancelling…', 'Cancelled. Collateral returned.')
  const handleLeave = () => doAction((c) => c.leaveRoom(id, ARC_GAS), 'Leaving…', 'Left room. Collateral returned.')
  const handleExpire = () => doAction((c) => c.expireRoom(id, ARC_GAS), 'Expiring…', 'Expired. Collateral returned.')
  const handleAutoRelease = () => doAction((c) => c.autoRelease(id, ARC_GAS), 'Auto-releasing…', 'Auto-released! Seller gets price + collateral.')
  const handleArbRelease = () => {
    const seller = room.creatorIsSeller ? room.creator : room.counterparty
    doAction((c) => c.arbiterResolve(id, seller, ARC_GAS), 'Resolving…', 'Released to seller (+ collateral)')
  }
  const handleArbRefund = () => {
    const buyer = room.creatorIsSeller ? room.counterparty : room.creator
    doAction((c) => c.arbiterResolve(id, buyer, ARC_GAS), 'Resolving…', 'Refunded to buyer (+ collateral)')
  }
  const handleArbSplit = () => doAction((c) => c.arbiterSplit(id, ARC_GAS), 'Splitting…', '50/50 split')

  const copyInvite = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canExpire = room && (
    (room.state === 'Created' && (Date.now() / 1000 - room.createdAt) > 3600) ||
    (room.state === 'Joined' && (Date.now() / 1000 - room.joinedAt) > 1800)
  )
  const canAutoRelease = room?.state === 'Delivered' && room.deliveredAt && (Date.now() / 1000 - room.deliveredAt) >= 7200

  if (loading) return <section className="pt-28 pb-32 px-4 sm:px-6 min-h-screen"><div className="max-w-full sm:max-w-[500px] mx-auto"><div className="card-3d p-8 text-center"><div className="text-stripe-body dark:text-gray-400 text-[14px]">Loading room…</div></div></div></section>
  if (!room) return <section className="pt-28 pb-32 px-4 sm:px-6 min-h-screen"><div className="max-w-full sm:max-w-[500px] mx-auto"><div className="card-3d p-8 text-center"><div className="text-red-600 text-[14px]">Room not found</div></div></div></section>

  const priceUSDC = room.price
  const taxUSDC = (Number(room.price) * 0.01).toFixed(2)
  const totalUSDC = (Number(room.price) * 1.01).toFixed(2)
  const hasCollateral = Number(room.collateralAmount) > 0

  return (
    <section className="pt-28 pb-32 px-4 sm:px-6 min-h-screen">
      <div className="max-w-full sm:max-w-[500px] mx-auto">
        <button onClick={() => navigate(-1)} className="text-[13px] text-stripe-body dark:text-gray-400 hover:text-stripe-navy dark:text-white transition mb-4">← Back</button>

        <div className="card-3d p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-[18px] font-semibold text-stripe-navy dark:text-white mb-1">{room.item}</div>
              <div className="text-[13px] text-stripe-body dark:text-gray-400 font-mono">Room #{id}</div>
            </div>
            <span className={`px-2.5 py-1 rounded text-[11px] font-semibold tracking-wider border ${STATE_BADGE[room.state] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
              {room.state}
            </span>
          </div>

          {/* Price breakdown */}
          <div className="border border-stripe-border dark:border-white/10 rounded p-4 mb-5">
            <PriceRow label="Item price" value={`${priceUSDC} USDC`} />
            <PriceRow label="Tax (1%)" value={`${taxUSDC} USDC`} />
            <PriceRow label="Total to fund" value={`${totalUSDC} USDC`} bold />
            {hasCollateral && (
              <PriceRow label="Seller collateral" value={`${room.collateralAmount} USDC`} bold />
            )}
          </div>

          {/* Collateral status */}
          {hasCollateral && Number(room.collateralAmount) > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-5">
              <div className="text-[10px] font-mono uppercase tracking-[2px] text-amber-600 mb-1">Collateral Locked</div>
              <div className="text-[18px] font-semibold text-amber-700 font-mono">{room.collateralAmount} USDC</div>
              <div className="text-[11px] text-amber-600 mt-1">
                {isCreator ? 'Your collateral is locked. Refunded on success/cancel.' : 'Seller has locked collateral as guarantee.'}
              </div>
            </div>
          )}

          {/* Auto-release countdown */}
          {room.state === 'Delivered' && countdown && (
            <div className="bg-purple-50 border border-purple-200 rounded p-3 mb-5 text-[13px] text-purple-800">
              ⏰ Auto-release: <span className="font-mono font-semibold">{countdown}</span>
              <br/>No action = funds + collateral released to seller after 2h
            </div>
          )}

          {/* In escrow */}
          {Number(room.value) > 0 && (
            <div className="bg-green-50 border border-green-200 rounded p-3 mb-5">
              <div className="text-[10px] font-mono uppercase tracking-[2px] text-green-600 mb-1">In Escrow</div>
              <div className="text-[18px] font-semibold text-green-700 font-mono">{room.value} USDC</div>
            </div>
          )}

          {/* Parties */}
          <div className="border border-stripe-border dark:border-white/10 rounded p-4 mb-5">
            <div className="text-[10px] font-mono uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-3">Parties</div>
            <PartyRow label="Creator" address={room.creator} role={room.creatorIsSeller ? 'Seller' : 'Buyer'} isYou={isCreator} reputation={creatorRep} />
            {room.counterparty !== '0x0000000000000000000000000000000000000000' ? (
              <PartyRow label="Counter" address={room.counterparty} role={room.creatorIsSeller ? 'Buyer' : 'Seller'} isYou={isCounter} reputation={counterpartyRep} />
            ) : (
              <div className="text-[13px] text-stripe-body dark:text-gray-400 py-2">Waiting for counter party…</div>
            )}
            <div className="text-[13px] text-stripe-body dark:text-gray-400 py-2">
              You are: <span className="font-medium text-stripe-navy dark:text-white">{isCreator ? (room.creatorIsSeller ? 'Seller' : 'Buyer') : isCounter ? (room.creatorIsSeller ? 'Buyer' : 'Seller') : 'Viewer'}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 mb-4">
            {/* CREATED */}
            {room.state === 'Created' && !isCreator && (
              <button onClick={handleJoin} disabled={!joinCode} className="btn-primary w-full py-3">
                {!joinCode ? '⚠️ Need invite link' : 'Join Room (FREE)'}
              </button>
            )}
            {room.state === 'Created' && isCreator && (
              <>
                <button onClick={copyInvite} className="btn-primary w-full py-3">
                  {copied ? '✓ Copied!' : 'Copy Invite Link'}
                </button>
                <button onClick={handleCancel} className="btn-ghost w-full py-3">Cancel Room</button>
              </>
            )}

            {/* JOINED */}
            {room.state === 'Joined' && isCounter && (
              <>
                <button onClick={handleFund} className="btn-primary w-full py-3">Fund {totalUSDC} USDC</button>
                <button onClick={handleLeave} className="btn-ghost w-full py-3">Leave Room</button>
              </>
            )}
            {room.state === 'Joined' && isCreator && (
              <>
                <div className="text-[13px] text-stripe-body dark:text-gray-400 text-center py-1">Waiting for buyer to fund…</div>
                <button onClick={handleLeave} className="btn-ghost w-full py-3">Leave Room</button>
              </>
            )}

            {/* FUNDED */}
            {room.state === 'Funded' && isCreator && (
              <button onClick={handleDeliver} className="btn-primary w-full py-3">Item Given ✓</button>
            )}
            {room.state === 'Funded' && isCounter && (
              <div className="text-[13px] text-stripe-body dark:text-gray-400 text-center py-1">Waiting for seller to give item…</div>
            )}

            {/* DELIVERED */}
            {room.state === 'Delivered' && isCounter && (
              <>
                <button onClick={handleRelease} className="btn-primary w-full py-3">Confirm Received</button>
                <button onClick={() => setShowDisputeForm(!showDisputeForm)} className="btn-ghost w-full py-3">⚖️ Open Dispute + Evidence</button>
              </>
            )}
            {room.state === 'Delivered' && isCreator && canAutoRelease && (
              <button onClick={handleAutoRelease} className="btn-ghost w-full py-3">⏰ Claim Auto-Release</button>
            )}
            {room.state === 'Delivered' && isCreator && !canAutoRelease && (
              <div className="text-[13px] text-stripe-body dark:text-gray-400 text-center py-1">Waiting for buyer to confirm receipt…</div>
            )}

            {/* Dispute Form */}
            {showDisputeForm && room.state === 'Delivered' && (
              <div className="bg-red-50 border border-red-200 rounded p-4 space-y-3">
                <div className="text-[13px] font-medium text-red-700">⚖️ Open Dispute</div>
                <div className="text-[11px] text-red-500">Explain the problem and attach evidence (screenshot link, tx hash, etc.)</div>
                <input
                  type="text"
                  placeholder="Reason for dispute"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-red-200 text-[13px] bg-white"
                />
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-red-200 text-[13px] bg-white"
                >
                  <option value="link">Link / URL</option>
                  <option value="screenshot">Screenshot</option>
                  <option value="tx_hash">Transaction Hash</option>
                  <option value="text">Text / Description</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={evidenceDesc}
                  onChange={(e) => setEvidenceDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-red-200 text-[13px] bg-white"
                />
                <input
                  type="text"
                  placeholder="Evidence URL / link / hash"
                  value={evidenceRef}
                  onChange={(e) => setEvidenceRef(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-red-200 text-[13px] bg-white"
                />
                <div className="flex gap-2">
                  <button onClick={handleDispute} className="btn-primary flex-1 py-2.5 text-[13px]">Submit Dispute</button>
                  <button onClick={() => setShowDisputeForm(false)} className="btn-ghost flex-1 py-2.5 text-[13px]">Cancel</button>
                </div>
              </div>
            )}

            {/* DISPUTED */}
            {room.state === 'Disputed' && (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <div className="text-[13px] text-red-700 font-medium text-center mb-1">⚖️ Under Dispute — Fund Frozen</div>
                <div className="text-[12px] text-red-500 text-center mb-3">
                  {arbiterName} will review evidence and decide on-chain
                </div>

                {/* Evidence List */}
                {evidence.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <div className="text-[11px] font-mono uppercase tracking-[2px] text-red-600">Submitted Evidence</div>
                    {evidence.map((ev) => (
                      <div key={ev.id} className="bg-white border border-red-100 rounded p-2.5">
                        <div className="flex justify-between items-start">
                          <div className="text-[11px] font-medium text-red-700">{ev.evidenceType}</div>
                          <div className="text-[10px] text-gray-400">{formatAddress(ev.submitter)}</div>
                        </div>
                        {ev.description && <div className="text-[12px] text-gray-600 mt-1">{ev.description}</div>}
                        <div className="text-[11px] text-blue-600 mt-1 break-all">
                          {ev.evidenceRef.startsWith('http') ? (
                            <a href={ev.evidenceRef} target="_blank" rel="noopener noreferrer" className="hover:underline">🔗 {ev.evidenceRef}</a>
                          ) : (
                            <span className="font-mono">{ev.evidenceRef}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Submit more evidence */}
                {isParticipant && (
                  <>
                    <button onClick={() => setShowEvidenceForm(!showEvidenceForm)} className="btn-ghost w-full py-2 text-[12px] mb-2">
                      + Add More Evidence
                    </button>
                    {showEvidenceForm && (
                      <div className="bg-white border border-red-100 rounded p-3 space-y-2">
                        <select
                          value={evidenceType}
                          onChange={(e) => setEvidenceType(e.target.value)}
                          className="w-full px-3 py-2 rounded border border-red-200 text-[13px]"
                        >
                          <option value="link">Link / URL</option>
                          <option value="screenshot">Screenshot</option>
                          <option value="tx_hash">Transaction Hash</option>
                          <option value="text">Text / Description</option>
                          <option value="other">Other</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Description (optional)"
                          value={evidenceDesc}
                          onChange={(e) => setEvidenceDesc(e.target.value)}
                          className="w-full px-3 py-2 rounded border border-red-200 text-[13px]"
                        />
                        <input
                          type="text"
                          placeholder="Evidence URL / link / hash"
                          value={evidenceRef}
                          onChange={(e) => setEvidenceRef(e.target.value)}
                          className="w-full px-3 py-2 rounded border border-red-200 text-[13px]"
                        />
                        <div className="flex gap-2">
                          <button onClick={handleSubmitEvidence} className="btn-primary flex-1 py-2 text-[12px]">Submit</button>
                          <button onClick={() => setShowEvidenceForm(false)} className="btn-ghost flex-1 py-2 text-[12px]">Cancel</button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {isAdmin && (
                  <div className="flex flex-col gap-2 mt-3">
                    <button onClick={handleArbRelease} className="btn-primary w-full py-2.5 text-[13px]">Release to Seller (price + collateral)</button>
                    <button onClick={handleArbRefund} className="btn-ghost w-full py-2.5 text-[13px]">Refund to Buyer (price + collateral)</button>
                    <button onClick={handleArbSplit} className="btn-ghost w-full py-2.5 text-[13px]">50/50 Split</button>
                  </div>
                )}
                {!isAdmin && (
                  <div className="text-[12px] text-red-500 text-center mt-2">
                    Awaiting arbiter decision. Funds are safe.
                  </div>
                )}
              </div>
            )}

            {/* EXPIRE */}
            {canExpire && (
              <button onClick={handleExpire} className="btn-ghost w-full py-2.5 text-[12px]">⏰ Expire Stale Room</button>
            )}

            {/* TERMINAL */}
            {['Released', 'Refunded', 'Expired', 'Cancelled'].includes(room.state) && (
              <div className="text-stripe-body dark:text-gray-400 text-[13px] text-center py-2">This deal is closed.</div>
            )}
          </div>

          {status && (
            <div className={`mt-1 px-4 py-2.5 rounded text-[13px] font-medium border ${
              status.type === 'ok' ? 'bg-green-50 text-green-700 border-green-100'
              : status.type === 'err' ? 'bg-red-50 text-red-600 border-red-100'
              : 'bg-blue-50 text-blue-700 border-blue-100'
            }`}>
              {status.msg}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function PriceRow({ label, value, bold }) {
  return (
    <div className={`flex justify-between text-[13px] py-1.5 ${bold ? 'font-medium' : ''} border-b border-stripe-border dark:border-white/10 last:border-b-0`}>
      <span className="text-stripe-body dark:text-gray-400">{label}</span>
      <span className="text-stripe-navy dark:text-white font-mono" style={{ fontFeatureSettings: '"tnum"' }}>{value}</span>
    </div>
  )
}

function PartyRow({ label, address, role, isYou, reputation }) {
  const badge = reputation ? getReputationBadge(reputation) : null
  const collBadge = reputation ? getCollateralBadge(reputation.multiplier) : null
  return (
    <div className="flex justify-between items-start py-2 border-b border-stripe-border dark:border-white/10 last:border-b-0">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-stripe-navy dark:text-white font-mono">{formatAddress(address)}</span>
          {isYou && <span className="text-[10px] text-purple-600 font-medium">(you)</span>}
          {badge && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badge.color} font-medium`}>
              {badge.label}
            </span>
          )}
        </div>
        {reputation && reputation.totalDeals > 0 && (
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span>{reputation.success} success</span>
            <span>·</span>
            <span>{reputation.dispute} dispute</span>
            <span>·</span>
            <span>{reputation.refunded} refunded</span>
            <span>·</span>
            <span>{reputation.successRate}% rate</span>
          </div>
        )}
        {collBadge && (
          <div className="flex items-center gap-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${collBadge.color} font-medium`}>
              Collateral: {collBadge.label}
            </span>
            <span className="text-[10px] text-gray-400">{collBadge.desc}</span>
          </div>
        )}
      </div>
      <span className="text-[12px] text-stripe-body dark:text-gray-400 shrink-0">{role}</span>
    </div>
  )
}

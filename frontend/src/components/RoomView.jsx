import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'
import { getContract, getUsdc, ensureArcChain, ARC_GAS, ARC_GAS_APPROVE, STATE_NAMES, CONTRACT_ADDRESS } from '../utils/contract'
import { fetchReputation, getReputationBadge, getCollateralBadge } from '../utils/reputation'
import RoomHistory from './room/RoomHistory'

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

const STATE_GUIDES = {
  Created: {
    seller: [
      'Share the invite link with your buyer.',
      'Room expires in 1 hour if no one joins.',
      'You can cancel anytime before someone joins.',
    ],
    buyer: [
      'Waiting for seller to share the invite link.',
      'Once you receive it, click Join Room.',
      'No funds are locked yet.',
    ],
  },
  Joined: {
    seller: [
      'Buyer has joined. Waiting for them to fund.',
      'Your collateral is locked as guarantee.',
      'You can leave now (collateral returned).',
    ],
    buyer: [
      'Fund the room with the total amount shown.',
      'Seller collateral is locked — your funds are protected.',
      'After funding, seller must deliver the item.',
    ],
  },
  Funded: {
    seller: [
      'Funds are now in escrow.',
      'Deliver the item, then click "Item Given".',
      'Buyer will confirm receipt to release funds.',
    ],
    buyer: [
      'Funds locked in escrow.',
      'Waiting for seller to deliver and mark "Item Given".',
      'You will confirm receipt once satisfied.',
    ],
  },
  Delivered: {
    seller: [
      'Waiting for buyer to confirm receipt.',
      'Auto-release happens 2 hours after delivery.',
      'If buyer disputes, evidence will be reviewed.',
    ],
    buyer: [
      'Seller marked item as delivered.',
      'If satisfied, click "Confirm Received".',
      'If there is an issue, open a dispute with evidence.',
      'Auto-release to seller happens in 2 hours if no action.',
    ],
  },
  Disputed: {
    seller: [
      'Dispute is open. Funds are frozen.',
      'Submit evidence to support your case.',
      'Arbiter will review and resolve on-chain.',
    ],
    buyer: [
      'Dispute is open. Funds are frozen.',
      'Submit evidence to support your case.',
      'Arbiter will review and resolve on-chain.',
    ],
  },
  Released: {
    both: ['Deal completed. Funds released to seller.'],
  },
  Refunded: {
    both: ['Deal closed. Buyer refunded.'],
  },
  Expired: {
    both: ['Room expired due to inactivity.'],
  },
  Cancelled: {
    both: ['Room cancelled by creator.'],
  },
}

const TREASURY = '0xB8b4e8E7Ad2651d36b8E0D24B5EF1ae06EE2cC4a'
const API_URL = import.meta.env.VITE_API_URL || 'https://arc-escrow-agent-production.up.railway.app'

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

  const [creatorRep, setCreatorRep] = useState(null)
  const [counterpartyRep, setCounterpartyRep] = useState(null)

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
      if (!wallet) { setRoom(null); setLoading(false); return }
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
        deliveryDeadline: Number(data.deliveryDeadline),
        state: STATE_NAMES[Number(data.state)],
        value: ethers.formatUnits(data.fundedAmount, 6),
        collateralLocked: data.collateralAmount,
        creatorIsSeller: data.creatorIsSeller,
      })
      try { setArbiterName(await contract.arbiterName()) } catch {}
      try { setArbiterAddr(await contract.arbiter()) } catch {}
      try { setOwnerAddr(await contract.owner()) } catch {}
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
      setRoom(null)
      setStatus({ type: 'err', msg: 'Room not found' })
    } finally { setLoading(false) }
  }

  async function loadEvidence() {
    try {
      if (!wallet || !id) return
      const provider = wallet.provider
      const contract = getContract(provider)
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
      const res = await fetch(`${API_URL}/api/evidence/${id}`)
      const backendEvidence = res.ok ? await res.json() : []
      const backendFormatted = backendEvidence.map(e => ({
        ...e,
        id: `backend-${e.id}`,
        source: 'backend',
      }))
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
    // Stop polling once room reaches a terminal state
    if (['Released', 'Refunded', 'Expired', 'Cancelled'].includes(room?.state)) return
    const interval = setInterval(() => { loadRoom(); loadEvidence() }, 10000)
    return () => clearInterval(interval)
  }, [id, wallet, room?.state])

  useEffect(() => {
    if (!room) return
    let target = 0
    let label = ''
    if (room.state === 'Created' && room.createdAt) { target = room.createdAt + 3600; label = 'Join deadline' }
    else if (room.state === 'Joined' && room.joinedAt) { target = room.joinedAt + 1800; label = 'Fund deadline' }
    else if (room.state === 'Funded' && room.deliveryDeadline) { target = room.deliveryDeadline; label = 'Deliver deadline' }
    else if (room.state === 'Delivered' && room.deliveredAt) { target = room.deliveredAt + 7200; label = 'Auto-release' }
    else if (room.state === 'Disputed' && room.disputedAt) { target = room.disputedAt + 21600; label = 'Arbiter deadline' }
    else { return }

    const tick = () => {
      const remaining = target - Math.floor(Date.now() / 1000)
      if (remaining <= 0) { setCountdown(`${label}: expired`); return }
      const h = Math.floor(remaining / 3600)
      const m = Math.floor((remaining % 3600) / 60)
      const s = remaining % 60
      setCountdown(`${label}: ${h}h ${m}m ${s}s`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [room?.state, room?.createdAt, room?.joinedAt, room?.deliveryDeadline, room?.deliveredAt, room?.disputedAt])

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
      setStatus({ type: 'info', msg: `TX sent: ${tx.hash.slice(0, 10)}… — waiting for confirmation…` })
      const receipt = await Promise.race([
        tx.wait(1),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TX timeout — check https://testnet.arcscan.app/tx/' + tx.hash)), 120000))
      ])
      if (receipt.status === 0) {
        setStatus({ type: 'err', msg: 'TX reverted on-chain' })
        return false
      }
      setStatus({ type: 'ok', msg: successMsg })
      loadRoom()
      loadEvidence()
      return true
    } catch (err) {
      console.error('TX failed:', err)
      setStatus({ type: 'err', msg: err.reason || err.message })
      return false
    }
  }

  const handleJoin = async () => {
    if (!joinCode) { setStatus({ type: 'err', msg: 'Invite link missing join code' }); return }
    try {
      const signer = await wallet.provider.getSigner()
      await ensureArcChain(signer)
      const contract = getContract(signer)
      // Pre-verify join code to avoid wasting gas
      const isValid = await contract.verifyJoinCode(id, ethers.toUtf8Bytes(joinCode))
      if (!isValid) { setStatus({ type: 'err', msg: 'Invalid invite code' }); return }
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
    const priceWei = ethers.parseUnits(room.price, 6)
    try {
      const signer = await wallet.provider.getSigner()
      await ensureArcChain(signer)
      const contract = getContract(signer)
      // Fetch dynamic tax from contract — never hardcode
      const taxBps = await contract.FUND_TAX_BPS()
      const feeWei = (priceWei * taxBps) / 10000n
      const exactNeeded = priceWei + feeWei
      const usdc = getUsdc(signer)
      const bal = await usdc.balanceOf(wallet.address)
      if (bal < exactNeeded) { setStatus({ type: 'err', msg: `Insufficient USDC. Need ${ethers.formatUnits(exactNeeded, 6)} USDC (incl. ${Number(taxBps)/100}% fee)` }); return }
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
  const handleBuyerRefund = () => doAction((c) => c.buyerRefund(id, ARC_GAS), 'Requesting refund…', 'Refunded! You receive price + seller collateral.')

  const handleDispute = async () => {
    if (!disputeReason.trim()) { setStatus({ type: 'err', msg: 'Reason required' }); return }
    const ok = await doAction(
      (c) => c.dispute(id, ARC_GAS),
      'Opening dispute…',
      'Disputed! Open a Discord ticket for arbiter review.'
    )
    if (!ok) return
    // Post evidence to backend after successful dispute TX
    try {
      if (evidenceRef.trim()) {
        const body = {
          submitter: wallet.address,
          evidenceType: evidenceType || 'link',
          description: disputeReason.trim() + (evidenceDesc.trim() ? ' | ' + evidenceDesc.trim() : ''),
          evidenceRef: evidenceRef.trim(),
        }
        await fetch(`${API_URL}/api/evidence/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        loadEvidence()
      }
    } catch (err) {
      console.error('Evidence POST failed:', err)
    }
    setShowDisputeForm(false)
    setDisputeReason('')
    setEvidenceDesc('')
    setEvidenceRef('')
  }

  const handleSubmitEvidence = async () => {
    if (!evidenceRef.trim()) { setStatus({ type: 'err', msg: 'Evidence required' }); return }
    setStatus({ type: 'info', msg: 'Submitting evidence…' })
    try {
      const body = {
        submitter: wallet.address,
        evidenceType: evidenceType || 'link',
        description: evidenceDesc.trim(),
        evidenceRef: evidenceRef.trim(),
      }
      const res = await fetch(`${API_URL}/api/evidence/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Server rejected evidence')
      setStatus({ type: 'ok', msg: 'Evidence submitted — share your Discord ticket link with the arbiter.' })
      setEvidenceDesc('')
      setEvidenceRef('')
      loadEvidence()
    } catch (err) {
      console.error('Evidence POST failed:', err)
      setStatus({ type: 'err', msg: 'Failed to submit evidence. Please copy-paste it into your Discord ticket instead.' })
    }
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
  const canBuyerRefund = room?.state === 'Funded' && room?.deliveryDeadline && (Date.now() / 1000) > room.deliveryDeadline
  const canAutoRelease = room?.state === 'Delivered' && room.deliveredAt && (Date.now() / 1000 - room.deliveredAt) >= 7200

  const role = isCreator ? (room?.creatorIsSeller ? 'seller' : 'buyer') : isCounter ? (room?.creatorIsSeller ? 'buyer' : 'seller') : null
  const guide = room && STATE_GUIDES[room.state] ? (STATE_GUIDES[room.state][role || 'both'] || STATE_GUIDES[room.state].both) : []

  if (loading) return (
    <section className="pt-28 pb-32 px-4 sm:px-6 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="card-3d p-8 text-center">
          <div className="text-stripe-body dark:text-gray-400 text-[14px]">Loading room…</div>
        </div>
      </div>
    </section>
  )

  if (!wallet) return (
    <section className="pt-28 pb-32 px-4 sm:px-6 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="card-3d p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-stripe-surface dark:bg-white/5 border border-stripe-border dark:border-white/10 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 15v2m0 0v2m0-2h2m-2 0H9m12-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <h2 className="text-[18px] font-medium text-stripe-navy dark:text-white mb-2">Connect your wallet</h2>
          <p className="text-[14px] text-stripe-body dark:text-gray-400">Use the "Connect Wallet" button in the top navigation.</p>
        </div>
      </div>
    </section>
  )

  if (!room) return (
    <section className="pt-28 pb-32 px-4 sm:px-6 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="card-3d p-8 text-center">
          <div className="text-red-600 text-[14px]">Room not found</div>
        </div>
      </div>
    </section>
  )

  const priceUSDC = room.price
  const taxUSDC = (Number(room.price) * 0.01).toFixed(2)
  const totalUSDC = (Number(room.price) * 1.01).toFixed(2)
  const hasCollateral = Number(room.collateralAmount) > 0

  return (
    <section className="pt-28 pb-32 px-4 sm:px-6 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-[13px] text-stripe-body dark:text-gray-400 hover:text-stripe-navy dark:hover:text-white transition mb-4">← Back</button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-[22px] sm:text-[26px] font-semibold text-stripe-navy dark:text-white leading-tight">{room.item}</h1>
              <div className="text-[13px] text-stripe-body dark:text-gray-400 font-mono mt-1">Room #{id}</div>
            </div>
            <span className={`px-3 py-1.5 rounded text-[12px] font-semibold tracking-wider border shrink-0 ${STATE_BADGE[room.state] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
              {room.state}
            </span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT COLUMN — Info (3/5) */}
          <div className="lg:col-span-3 space-y-5">
            {/* Price */}
            <div className="card-3d p-5">
              <div className="text-[10px] font-mono uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-3">Price Breakdown</div>
              <PriceRow label="Item price" value={`${priceUSDC} USDC`} />
              <PriceRow label="Tax (1%)" value={`${taxUSDC} USDC`} />
              <PriceRow label="Total to fund" value={`${totalUSDC} USDC`} bold />
              {hasCollateral && <PriceRow label="Seller collateral" value={`${room.collateralAmount} USDC`} bold />}
            </div>

            {/* Escrow & Collateral */}
            {Number(room.value) > 0 && (
              <div className="card-3d p-5">
                <div className="text-[10px] font-mono uppercase tracking-[2px] text-green-600 mb-2">In Escrow</div>
                <div className="text-[24px] font-semibold text-green-700 font-mono">{room.value} USDC</div>
                <div className="text-[12px] text-stripe-body dark:text-gray-400 mt-1">Locked on-chain until deal completes</div>
              </div>
            )}

            {hasCollateral && (
              <div className="card-3d p-5">
                <div className="text-[10px] font-mono uppercase tracking-[2px] text-amber-600 mb-2">Collateral Locked</div>
                <div className="text-[20px] font-semibold text-amber-700 font-mono">{room.collateralAmount} USDC</div>
                <div className="text-[12px] text-stripe-body dark:text-gray-400 mt-1">
                  {isCreator ? 'Your collateral. Refunded on success/cancel/expire.' : 'Seller collateral acts as guarantee. Refunded to seller on success.'}
                </div>
              </div>
            )}

            {/* Parties */}
            <div className="card-3d p-5">
              <div className="text-[10px] font-mono uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-4">Parties</div>
              <div className="space-y-4">
                <PartyCard
                  label="Creator"
                  address={room.creator}
                  role={room.creatorIsSeller ? 'Seller' : 'Buyer'}
                  isYou={isCreator}
                  reputation={creatorRep}
                />
                {room.counterparty !== '0x0000000000000000000000000000000000000000' ? (
                  <PartyCard
                    label="Counterparty"
                    address={room.counterparty}
                    role={room.creatorIsSeller ? 'Buyer' : 'Seller'}
                    isYou={isCounter}
                    reputation={counterpartyRep}
                  />
                ) : (
                  <div className="text-[13px] text-stripe-body dark:text-gray-400 py-3 border border-dashed border-stripe-border dark:border-white/10 rounded px-3">
                    Waiting for counterparty to join…
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-stripe-border dark:border-white/10">
                <div className="text-[13px] text-stripe-body dark:text-gray-400">
                  You are: <span className="font-medium text-stripe-navy dark:text-white">{isCreator ? (room.creatorIsSeller ? 'Seller' : 'Buyer') : isCounter ? (room.creatorIsSeller ? 'Buyer' : 'Seller') : 'Viewer'}</span>
                </div>
              </div>
            </div>

            {/* Evidence (if disputed) */}
            {room.state === 'Disputed' && evidence.length > 0 && (
              <div className="card-3d p-5">
                <div className="text-[10px] font-mono uppercase tracking-[2px] text-red-600 mb-3">Submitted Evidence</div>
                <div className="space-y-2">
                  {evidence.map((ev) => (
                    <div key={ev.id} className="border border-red-100 rounded p-3">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[11px] font-medium text-red-700 uppercase">{ev.evidenceType}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">{formatAddress(ev.submitter)}</span>
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
              </div>
            )}

            {/* Room History */}
            <RoomHistory roomId={id} provider={wallet.provider} />
          </div>

          {/* RIGHT COLUMN — Actions (2/5) */}
          <div className="lg:col-span-2 space-y-5">
            {/* State Guide */}
            {guide.length > 0 && (
              <div className="card-3d p-5">
                <div className="text-[10px] font-mono uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-3">What to do</div>
                <ul className="space-y-2">
                  {guide.map((g, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-stripe-body dark:text-gray-300">
                      <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Countdown */}
            {countdown && (
              <div className={`rounded-lg p-4 border ${
                countdown.includes('expired')
                  ? 'bg-red-50 border-red-200'
                  : room.state === 'Disputed'
                  ? 'bg-red-50 border-red-200'
                  : room.state === 'Funded'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-purple-50 border-purple-200'
              }`}>
                <div className={`text-[10px] font-mono uppercase tracking-[2px] mb-1 ${
                  countdown.includes('expired') ? 'text-red-600' : room.state === 'Disputed' ? 'text-red-600' : room.state === 'Funded' ? 'text-amber-600' : 'text-purple-600'
                }`}>Deadline</div>
                <div className={`text-[18px] font-semibold font-mono ${
                  countdown.includes('expired') ? 'text-red-800' : room.state === 'Disputed' ? 'text-red-800' : room.state === 'Funded' ? 'text-amber-800' : 'text-purple-800'
                }`}>{countdown}</div>
                {room.state === 'Funded' && (
                  <div className="text-[11px] text-amber-600 mt-1">Seller must deliver before deadline</div>
                )}
                {room.state === 'Delivered' && (
                  <div className="text-[11px] text-purple-600 mt-1">No action = funds released to seller</div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="card-3d p-5 space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-1">Actions</div>

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
                  <div className="text-[13px] text-stripe-body dark:text-gray-400 text-center py-2 bg-gray-50 dark:bg-white/5 rounded">Waiting for buyer to fund…</div>
                  <button onClick={handleLeave} className="btn-ghost w-full py-3">Leave Room</button>
                </>
              )}

              {/* FUNDED */}
              {room.state === 'Funded' && isCreator && (
                <button onClick={handleDeliver} className="btn-primary w-full py-3">Item Given ✓</button>
              )}
              {room.state === 'Funded' && isCounter && (
                <>
                  {canBuyerRefund ? (
                    <button onClick={handleBuyerRefund} className="btn-primary w-full py-3">Refund — Seller didn't deliver</button>
                  ) : (
                    <div className="text-[13px] text-stripe-body dark:text-gray-400 text-center py-2 bg-gray-50 dark:bg-white/5 rounded">Waiting for seller to give item…</div>
                  )}
                </>
              )}

              {/* DELIVERED */}
              {room.state === 'Delivered' && isCounter && (
                <>
                  <button onClick={handleRelease} className="btn-primary w-full py-3">Confirm Received</button>
                  <button onClick={() => setShowDisputeForm(!showDisputeForm)} className="btn-ghost w-full py-3">⚖️ Open Dispute + Evidence</button>
                </>
              )}
              {room.state === 'Delivered' && isCreator && canAutoRelease && (
                <button onClick={handleAutoRelease} className="btn-primary w-full py-3">⏰ Claim Auto-Release</button>
              )}
              {room.state === 'Delivered' && isCreator && !canAutoRelease && (
                <div className="text-[13px] text-stripe-body dark:text-gray-400 text-center py-2 bg-gray-50 dark:bg-white/5 rounded">Waiting for buyer to confirm…</div>
              )}

              {/* Dispute Form */}
              {showDisputeForm && room.state === 'Delivered' && (
                <div className="bg-red-50 border border-red-200 rounded p-4 space-y-3">
                  <div className="text-[13px] font-medium text-red-700">⚖️ Open Dispute</div>
                  <div className="text-[11px] text-red-500">Explain the problem and attach evidence (screenshot link, tx hash, etc.)</div>
                  <input type="text" placeholder="Reason for dispute" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} className="w-full px-3 py-2 rounded border border-red-200 text-[13px] bg-white" />
                  <select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)} className="w-full px-3 py-2 rounded border border-red-200 text-[13px] bg-white">
                    <option value="link">Link / URL</option>
                    <option value="screenshot">Screenshot</option>
                    <option value="tx_hash">Transaction Hash</option>
                    <option value="text">Text / Description</option>
                    <option value="other">Other</option>
                  </select>
                  <input type="text" placeholder="Description (optional)" value={evidenceDesc} onChange={(e) => setEvidenceDesc(e.target.value)} className="w-full px-3 py-2 rounded border border-red-200 text-[13px] bg-white" />
                  <input type="text" placeholder="Evidence URL / link / hash" value={evidenceRef} onChange={(e) => setEvidenceRef(e.target.value)} className="w-full px-3 py-2 rounded border border-red-200 text-[13px] bg-white" />
                  <div className="flex gap-2">
                    <button onClick={handleDispute} className="btn-primary flex-1 py-2.5 text-[13px]">Submit Dispute</button>
                    <button onClick={() => setShowDisputeForm(false)} className="btn-ghost flex-1 py-2.5 text-[13px]">Cancel</button>
                  </div>
                </div>
              )}

              {/* DISPUTED */}
              {room.state === 'Disputed' && (
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <div className="text-[13px] text-red-700 font-medium text-center mb-1">⚖️ Under Dispute</div>
                  <div className="text-[12px] text-red-500 text-center mb-3">{arbiterName} will review evidence and decide on-chain</div>

                  {isParticipant && (
                    <>
                      <button onClick={() => setShowEvidenceForm(!showEvidenceForm)} className="btn-ghost w-full py-2 text-[12px] mb-2">+ Add More Evidence</button>
                      {showEvidenceForm && (
                        <div className="bg-white border border-red-100 rounded p-3 space-y-2">
                          <select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)} className="w-full px-3 py-2 rounded border border-red-200 text-[13px]">
                            <option value="link">Link / URL</option>
                            <option value="screenshot">Screenshot</option>
                            <option value="tx_hash">Transaction Hash</option>
                            <option value="text">Text / Description</option>
                            <option value="other">Other</option>
                          </select>
                          <input type="text" placeholder="Description (optional)" value={evidenceDesc} onChange={(e) => setEvidenceDesc(e.target.value)} className="w-full px-3 py-2 rounded border border-red-200 text-[13px]" />
                          <input type="text" placeholder="Evidence URL / link / hash" value={evidenceRef} onChange={(e) => setEvidenceRef(e.target.value)} className="w-full px-3 py-2 rounded border border-red-200 text-[13px]" />
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
                      <button onClick={handleArbRelease} className="btn-primary w-full py-2.5 text-[13px]">Release to Seller</button>
                      <button onClick={handleArbRefund} className="btn-ghost w-full py-2.5 text-[13px]">Refund to Buyer</button>
                      <button onClick={handleArbSplit} className="btn-ghost w-full py-2.5 text-[13px]">50/50 Split</button>
                    </div>
                  )}
                  {!isAdmin && (
                    <div className="text-[12px] text-red-500 text-center mt-2">Awaiting arbiter decision. Funds are safe.</div>
                  )}
                </div>
              )}

              {/* EXPIRE */}
              {canExpire && isParticipant && (
                <button onClick={handleExpire} className="btn-ghost w-full py-2.5 text-[12px]">⏰ Expire Stale Room</button>
              )}

              {/* TERMINAL */}
              {['Released', 'Refunded', 'Expired', 'Cancelled'].includes(room.state) && (
                <div className="text-stripe-body dark:text-gray-400 text-[13px] text-center py-2 bg-gray-50 dark:bg-white/5 rounded">This deal is closed.</div>
              )}
            </div>

            {/* Status */}
            {status && (
              <div className={`px-4 py-3 rounded text-[13px] font-medium border ${
                status.type === 'ok' ? 'bg-green-50 text-green-700 border-green-100'
                : status.type === 'err' ? 'bg-red-50 text-red-600 border-red-100'
                : 'bg-blue-50 text-blue-700 border-blue-100'
              }`}>
                {status.msg}
              </div>
            )}

            {/* Arbiter Info */}
            <div className="card-3d p-4">
              <div className="text-[10px] font-mono uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Arbiter</div>
              <div className="text-[13px] text-stripe-navy dark:text-white font-medium">{arbiterName}</div>
              <div className="text-[11px] text-stripe-body dark:text-gray-400 font-mono mt-0.5">{formatAddress(arbiterAddr)}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PriceRow({ label, value, bold }) {
  return (
    <div className={`flex justify-between text-[13px] py-2 ${bold ? 'font-medium' : ''} border-b border-stripe-border dark:border-white/10 last:border-b-0`}>
      <span className="text-stripe-body dark:text-gray-400">{label}</span>
      <span className="text-stripe-navy dark:text-white font-mono" style={{ fontFeatureSettings: '"tnum"' }}>{value}</span>
    </div>
  )
}

function PartyCard({ label, address, role, isYou, reputation }) {
  const badge = reputation ? getReputationBadge(reputation) : null
  const collBadge = reputation ? getCollateralBadge(reputation.multiplier) : null
  return (
    <div className="border border-stripe-border dark:border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-stripe-body dark:text-gray-400">{label}</span>
          {isYou && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200 font-medium">YOU</span>}
        </div>
        <span className="text-[12px] text-stripe-body dark:text-gray-400 shrink-0">{role}</span>
      </div>

      <div className="text-[14px] font-mono text-stripe-navy dark:text-white mb-3">{formatAddress(address)}</div>

      {reputation && reputation.totalDeals > 0 ? (
        <div className="space-y-2">
          {/* Reputation Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            {badge && (
              <span className={`text-[11px] px-2 py-1 rounded border ${badge.color} font-medium`}>
                {badge.label}
              </span>
            )}
            {collBadge && (
              <span className={`text-[11px] px-2 py-1 rounded border ${collBadge.color} font-medium`}>
                Collateral {collBadge.label}
              </span>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2 mt-2">
            <div className="text-center p-2 bg-gray-50 dark:bg-white/5 rounded">
              <div className="text-[14px] font-semibold text-stripe-navy dark:text-white">{reputation.totalDeals}</div>
              <div className="text-[10px] text-stripe-body dark:text-gray-400">Deals</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="text-[14px] font-semibold text-green-700">{reputation.success}</div>
              <div className="text-[10px] text-green-600">Success</div>
            </div>
            <div className="text-center p-2 bg-red-50 rounded">
              <div className="text-[14px] font-semibold text-red-700">{reputation.dispute}</div>
              <div className="text-[10px] text-red-600">Dispute</div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-white/5 rounded">
              <div className="text-[14px] font-semibold text-stripe-navy dark:text-white">{reputation.successRate}%</div>
              <div className="text-[10px] text-stripe-body dark:text-gray-400">Rate</div>
            </div>
          </div>

          {/* Success Rate Bar */}
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-stripe-body dark:text-gray-400 mb-1">
              <span>Success rate</span>
              <span>{reputation.successRate}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${reputation.successRate}%`,
                  backgroundColor: reputation.successRate >= 90 ? '#10b981' : reputation.successRate >= 70 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
          </div>

          {collBadge && (
            <div className="text-[11px] text-stripe-body dark:text-gray-400 mt-1">{collBadge.desc}</div>
          )}
        </div>
      ) : (
        <div className="text-[12px] text-stripe-body dark:text-gray-400">No reputation history yet</div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'
import { getContract, getUsdc, ensureArcChain, ARC_GAS, ARC_GAS_APPROVE, STATE_NAMES, CONTRACT_ADDRESS, waitForTx , parseRoom, fixSignerNonce } from '../utils/contract'
import { fetchReputation, getReputationBadge, getCollateralBadge } from '../utils/reputation'
import RoomHistory from './room/RoomHistory'
import ActionPanel from './room/ActionPanel'
import Skeleton from './Skeleton'
import { useToast } from '../hooks/useToast'
import { useSmartPolling } from '../hooks/useSmartPolling'

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
      'Room expires in 1 day if no one joins.',
      'You can cancel anytime before someone joins.',
    ],
    buyer: [
      'Room created from market deal.',
      'Seller has been notified to join.',
      'You can share the invite link as backup.',
      'No funds are locked yet.',
    ],
  },
  Joined: {
    seller: [
      'Buyer has joined. Waiting for them to fund.',
      'Your collateral is locked as guarantee.',
      'Both parties can agree to mutual cancel before funding.',
    ],
    buyer: [
      'Fund the room with the total amount shown.',
      'Seller collateral is locked — your funds are protected.',
      'After funding, seller must deliver the item.',
      'You can leave now if you change your mind.',
    ],
  },
  Funded: {
    seller: [
      'Funds are now in escrow.',
      'Deliver the item, then click "Item Given".',
      'Buyer will confirm receipt to release funds.',
      'Both parties can agree to mutual cancel.',
    ],
    buyer: [
      'Funds locked in escrow.',
      'Waiting for seller to deliver and mark "Item Given".',
      'You will confirm receipt once satisfied.',
      'Both parties can agree to mutual cancel.',
    ],
  },
  Delivered: {
    seller: [
      'Waiting for buyer to confirm receipt.',
      'Buyer has a confirm window based on deal type.',
      'If buyer ghosts, you can escalate to arbiter after the window.',
      'Both parties can still agree to mutual cancel.',
    ],
    buyer: [
      'Seller marked item as delivered.',
      'If satisfied, click "Confirm Received" to release funds.',
      'If there is an issue, open a dispute with evidence.',
      'You have a confirm window — check the timer above.',
      'Both parties can agree to mutual cancel.',
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
  const [confirmCountdown, setConfirmCountdown] = useState(null)
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
  const [mutualCancelStatus, setMutualCancelStatus] = useState({ creatorApproved: false, counterpartyApproved: false })
  const [proofInput, setProofInput] = useState('')
  const [txPending, setTxPending] = useState(false)
  const { addToast } = useToast()

  const account = wallet?.address?.toLowerCase()

  async function loadRoom() {
    try {
      if (!wallet) { setRoom(null); setLoading(false); return }
      const provider = wallet.provider
      const contract = getContract(provider)
      const data = parseRoom(await contract.rooms(id))
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
        confirmDeadline: Number(data.confirmDeadline),
        dealType: Number(data.dealType),
        state: STATE_NAMES[Number(data.state)],
        value: ethers.formatUnits(data.fundedAmount, 6),
        collateralLocked: data.collateralAmount,
        creatorIsSeller: data.creatorIsSeller,
      })
      try { setArbiterName(await contract.arbiterName()) } catch {}
      try { setArbiterAddr(await contract.arbiter()) } catch {}
      try { setOwnerAddr(await contract.owner()) } catch {}
      try {
        const mc = await contract.getMutualCancelStatus(id)
        setMutualCancelStatus({ creatorApproved: mc[0], counterpartyApproved: mc[1] })
      } catch {}
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

  const isTerminal = ['Released', 'Refunded', 'Expired', 'Cancelled'].includes(room?.state)
  useSmartPolling(
    async () => { await loadRoom(); await loadEvidence() },
    [id, wallet?.address],
    { interval: 10000, enabled: !!wallet && !isTerminal }
  )

  useEffect(() => {
    if (!room) return
    let target = 0
    let label = ''
    if (room.state === 'Created' && room.createdAt) { target = room.createdAt + 86400; label = 'Join deadline' }
    else if (room.state === 'Joined' && room.joinedAt) { target = room.joinedAt + 1800; label = 'Fund deadline' }
    else if (room.state === 'Funded' && room.deliveryDeadline) { target = room.deliveryDeadline; label = 'Deliver deadline' }
    else if (room.state === 'Delivered' && room.confirmDeadline) { target = room.confirmDeadline; label = 'Confirm window' }
    else if (room.state === 'Disputed' && room.disputedAt) { label = 'Pending arbiter'; setCountdown('Pending arbiter'); return }
    else { setCountdown(''); return }

    const tick = () => {
      const remaining = target - Math.floor(Date.now() / 1000)
      if (remaining <= 0) { setCountdown('Expired'); return }
      const h = Math.floor(remaining / 3600)
      const m = Math.floor((remaining % 3600) / 60)
      const s = remaining % 60
      const parts = []
      if (h > 0) parts.push(`${h}h`)
      if (m > 0 || h > 0) parts.push(`${m}m`)
      parts.push(`${s}s`)
      setCountdown(parts.join(' '))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [room?.state, room?.createdAt, room?.joinedAt, room?.deliveryDeadline, room?.confirmDeadline, room?.disputedAt])

  const isCreator = account === room?.creator?.toLowerCase()
  const isCounter = account === room?.counterparty?.toLowerCase()
  const isParticipant = isCreator || isCounter
  const isAdmin = account === ownerAddr?.toLowerCase() || account === arbiterAddr?.toLowerCase()

  async function doAction(fn, label, successMsg) {
    setTxPending(true)
    setStatus({ type: 'info', msg: label })
    addToast(label, 'info')

    try {
      const RETRIES = 2
      for (let attempt = 0; attempt <= RETRIES; attempt++) {
        try {
          const signer = await wallet.provider.getSigner()
          await ensureArcChain(signer)
          const restore = await fixSignerNonce(signer, wallet.provider)
          try {
            const contract = getContract(signer)
            const tx = await fn(contract)
            setStatus({ type: 'info', msg: `TX sent: ${tx.hash.slice(0, 10)}\u2026 \u2014 waiting for confirmation\u2026` })
            addToast(`TX sent ${tx.hash.slice(0, 14)}...`, 'info')
            const receipt = await waitForTx(wallet.provider, tx.hash, 120000)
            if (receipt.status === 0) {
              setStatus({ type: 'err', msg: 'TX reverted on-chain' })
              addToast('Transaction reverted on-chain', 'err')
              return false
            }
            setStatus({ type: 'ok', msg: successMsg })
            addToast(successMsg, 'ok')
            loadRoom()
            loadEvidence()
            return true
          } finally {
            restore()
          }
        } catch (err) {
          const msg = err.reason || err.message || String(err)
          // User rejection = don't retry
          if (msg.includes('denied') || msg.includes('User rejected') || msg.includes('revert') || msg.includes('execution reverted')) {
            setStatus({ type: '', msg: '' })
            if (!msg.includes('denied') && !msg.includes('User rejected')) {
              addToast(msg.slice(0, 120), 'err')
            }
            return false
          }
          // Network/RPC error = retry with backoff
          if (attempt < RETRIES) {
            const delay = 1000 * Math.pow(2, attempt)
            addToast(`Retrying in ${delay/1000}s\u2026 (${attempt + 1}/${RETRIES})`, 'info')
            await new Promise(r => setTimeout(r, delay))
            continue
          }
          console.error('TX failed:', err)
          setStatus({ type: 'err', msg: msg.slice(0, 100) })
          addToast(msg.slice(0, 120), 'err')
          return false
        }
      }
      return false
    } finally {
      setTxPending(false)
    }
  }

  const handleJoin = async () => {
    if (!joinCode) { setStatus({ type: 'err', msg: 'Invite link missing join code' }); return }
    setTxPending(true)
    try {
      const signer = await wallet.provider.getSigner()
      await ensureArcChain(signer)
      const restore = await fixSignerNonce(signer)
      try {
        const contract = getContract(signer)
        // Pre-verify join code to avoid wasting gas
        const isValid = await contract.verifyJoinCode(id, ethers.toUtf8Bytes(joinCode))
        if (!isValid) { setStatus({ type: 'err', msg: 'Invalid invite code' }); return }
        if (!room.creatorIsSeller && room.collateralAmount && ethers.parseUnits(room.collateralAmount, 6) > 0n) {
          const collateralWei = ethers.parseUnits(room.collateralAmount, 6)
          const usdc = getUsdc(signer)
          const allowance = await usdc.allowance(wallet.address, CONTRACT_ADDRESS)
          if (allowance < collateralWei) {
            setStatus({ type: 'info', msg: 'Approving collateral\u2026' })
            const approveTx = await usdc.approve(CONTRACT_ADDRESS, collateralWei, ARC_GAS_APPROVE)
            await waitForTx(wallet.provider, approveTx.hash, 180000)
          }
        }
        setStatus({ type: 'info', msg: 'Joining\u2026' })
        const tx = await contract.joinRoom(id, ethers.toUtf8Bytes(joinCode), ARC_GAS)
        await waitForTx(wallet.provider, tx.hash, 180000)
        setStatus({ type: 'ok', msg: 'Joined!' })
        loadRoom()
      } finally {
        restore()
      }
    } catch (e) {
      setStatus({ type: 'err', msg: e.reason || e.message })
    } finally {
      setTxPending(false)
    }
  }

  const handleFund = async () => {
    const priceWei = ethers.parseUnits(room.price, 6)
    setTxPending(true)
    try {
      const signer = await wallet.provider.getSigner()
      await ensureArcChain(signer)
      const restore = await fixSignerNonce(signer)
      try {
        const contract = getContract(signer)
        // Fetch dynamic tax from contract — never hardcode
        const taxBps = await contract.FUND_TAX_BPS()
        const feeWei = (priceWei * taxBps) / 10000n
        const exactNeeded = priceWei + feeWei
        const usdc = getUsdc(signer)
        const bal = await usdc.balanceOf(wallet.address)
        if (bal < exactNeeded) { setStatus({ type: 'err', msg: `Insufficient USDC. Need ${ethers.formatUnits(exactNeeded, 6)} USDC (incl. ${Number(taxBps)/100}% fee)` }); return }
        setStatus({ type: 'info', msg: 'Approving USDC\u2026' })
        const approveTx = await usdc.approve(CONTRACT_ADDRESS, exactNeeded, ARC_GAS_APPROVE)
        await waitForTx(wallet.provider, approveTx.hash, 180000)
        setStatus({ type: 'info', msg: 'Funding room\u2026' })
        const fundTx = await contract.fundRoom(id, ARC_GAS)
        await waitForTx(wallet.provider, fundTx.hash, 180000)
        setStatus({ type: 'ok', msg: 'Funded!' })
        loadRoom()
      } finally {
        restore()
      }
    } catch (e) {
      setStatus({ type: 'err', msg: e.reason || e.message })
    } finally {
      setTxPending(false)
    }
  }

  const handleDeliver = () => doAction((c) => c.markDelivered(id, proofInput ? ethers.keccak256(ethers.toUtf8Bytes(proofInput)) : ethers.ZeroHash, ARC_GAS), 'Confirming item given…', 'Delivered!')
  const handleRelease = () => doAction((c) => c.releaseFunds(id, ARC_GAS), 'Confirming receipt…', 'Released! Seller gets price + collateral.')
  const handleBuyerRefund = () => doAction((c) => c.buyerRefund(id, ARC_GAS), 'Requesting refund…', 'Refunded! You receive price + seller collateral.')

  const handleDispute = async () => {
    if (!disputeReason.trim()) { setStatus({ type: 'err', msg: 'Reason required' }); return }
    const ok = await doAction(
      (c) => c.openDispute(id, disputeReason.trim(), evidenceType || 'link', evidenceDesc.trim(), evidenceRef.trim(), ARC_GAS),
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
    // Register dispute for arbiter dashboard
    try {
      await fetch(`${API_URL}/api/disputes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: id,
          item: room?.item || '',
          price: room?.price || '',
          collateral: room?.collateralAmount || '0',
          creator: room?.creator || '',
          counterparty: room?.counterparty || '',
          disputedBy: wallet.address,
          reason: disputeReason.trim(),
          evidenceRef: evidenceRef.trim() || '',
        }),
      })
    } catch (err) {
      console.error('Dispute register POST failed:', err)
    }
    setShowDisputeForm(false)
    setDisputeReason('')
    setEvidenceDesc('')
    setEvidenceRef('')
  }

  const handleSubmitEvidence = async () => {
    if (!evidenceRef.trim()) { setStatus({ type: 'err', msg: 'Evidence required' }); return }
    setTxPending(true)
    try {
      setStatus({ type: 'info', msg: 'Submitting evidence…' })
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
    } finally {
      setTxPending(false)
    }
  }

  const handleCancel = () => doAction((c) => c.cancelRoom(id, ARC_GAS), 'Cancelling…', 'Cancelled. Collateral returned.')
  const handleLeave = () => doAction((c) => c.leaveRoom(id, ARC_GAS), 'Leaving…', 'Left room. Collateral returned.')
  const handleExpire = () => doAction((c) => c.expireRoom(id, ARC_GAS), 'Expiring…', 'Expired. Collateral returned.')

  const handleRequestMutualCancel = () => doAction((c) => c.requestMutualCancel(id, ARC_GAS), 'Requesting mutual cancel…', 'You approved mutual cancel. Waiting for counterparty.')
  const handleRevokeMutualCancel = () => doAction((c) => c.revokeMutualCancel(id, ARC_GAS), 'Revoking mutual cancel…', 'You revoked your approval.')
  const handleExecuteMutualCancel = () => doAction((c) => c.executeMutualCancel(id, ARC_GAS), 'Executing mutual cancel…', 'Deal cancelled. All funds refunded.')
  const handleArbRelease = () => {
    const seller = room.creatorIsSeller ? room.creator : room.counterparty
    doAction((c) => c.arbiterResolve(id, seller, ARC_GAS), 'Resolving…', 'Released to seller (+ collateral)')
  }
  const handleArbRefund = () => {
    const buyer = room.creatorIsSeller ? room.counterparty : room.creator
    doAction((c) => c.arbiterResolve(id, buyer, ARC_GAS), 'Resolving…', 'Refunded to buyer (+ collateral)')
  }
  const handleArbSplit = () => doAction((c) => c.arbiterSplit(id, ARC_GAS), 'Splitting…', '50/50 split')
  const handleEscalate = () => doAction((c) => c.escalateNoResponse(id, ARC_GAS), 'Escalating…', 'Escalated! Arbiter will review delivery proof.')

  const copyInvite = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canExpire = room && (
    (room.state === 'Created' && (Date.now() / 1000 - room.createdAt) > 86400) ||
    (room.state === 'Joined' && (Date.now() / 1000 - room.joinedAt) > 1800)
  )
  const canBuyerRefund = room?.state === 'Funded' && room?.deliveryDeadline && (Date.now() / 1000) > room.deliveryDeadline
  const canEscalate = room?.state === 'Delivered' && room.confirmDeadline && (Date.now() / 1000) > room.confirmDeadline

  const canMutualCancel = isParticipant && ['Joined', 'Funded', 'Delivered'].includes(room?.state)
  const hasApprovedMutualCancel = isCreator ? mutualCancelStatus.creatorApproved : isCounter ? mutualCancelStatus.counterpartyApproved : false
  const counterpartyApprovedMutualCancel = isCreator ? mutualCancelStatus.counterpartyApproved : isCounter ? mutualCancelStatus.creatorApproved : false
  const mutualCancelReady = mutualCancelStatus.creatorApproved && mutualCancelStatus.counterpartyApproved

  const role = isCreator ? (room?.creatorIsSeller ? 'seller' : 'buyer') : isCounter ? (room?.creatorIsSeller ? 'buyer' : 'seller') : null
  const isSeller = role === 'seller'
  const isBuyer = role === 'buyer'
  const guide = room && STATE_GUIDES[room.state] ? (STATE_GUIDES[room.state][role || 'both'] || STATE_GUIDES[room.state].both) : []

  if (loading) return (
    <section className="pt-28 pb-32 px-4 sm:px-6 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="card-3d p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="w-16 h-6" />
            <Skeleton className="w-32 h-6" />
            <div className="ml-auto"><Skeleton className="w-20 h-8" /></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <Skeleton className="w-3/4 h-8" />
              <Skeleton lines={4} />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-40" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )

  if (!wallet) return (
    <section className="pt-28 pb-32 px-4 sm:px-6 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="card-3d p-8 text-center max-w-[500px] mx-auto">
          <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-stripe-surface dark:bg-white/5 border border-stripe-border dark:border-white/10 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 15v2m0 0v2m0-2h2m-2 0H9m12-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <h2 className="text-[18px] font-medium text-stripe-navy dark:text-white mb-2">Connect Your Wallet</h2>
          <p className="text-[14px] text-stripe-body dark:text-gray-400 mb-6">Use the "Connect Wallet" button in the top navigation to get started.</p>
          <div className="text-left bg-stripe-surface dark:bg-white/5 rounded-lg p-4 space-y-2 text-[13px] text-stripe-body dark:text-gray-400">
            <div className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✓</span> Switch to <strong className="text-stripe-navy dark:text-white">Arc Testnet</strong> (chain ID 5042002)</div>
            <div className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✓</span> You need <strong className="text-stripe-navy dark:text-white">test USDC</strong> to create or join rooms</div>
            <div className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✓</span> Need test USDC? Ask in Discord or check the docs</div>
          </div>
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
                countdown === 'Expired'
                  ? 'bg-red-50 border-red-200'
                  : room.state === 'Disputed'
                  ? 'bg-red-50 border-red-200'
                  : room.state === 'Funded'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-purple-50 border-purple-200'
              }`}>
                <div className={`text-[10px] font-mono uppercase tracking-[2px] mb-1 ${
                  countdown === 'Expired' ? 'text-red-600' : room.state === 'Disputed' ? 'text-red-600' : room.state === 'Funded' ? 'text-amber-600' : 'text-purple-600'
                }`}>Deadline</div>
                <div className={`text-[18px] font-semibold font-mono ${
                  countdown === 'Expired' ? 'text-red-800' : room.state === 'Disputed' ? 'text-red-800' : room.state === 'Funded' ? 'text-amber-800' : 'text-purple-800'
                }`}>{countdown}</div>
                {room.state === 'Funded' && (
                  <div className="text-[11px] text-amber-600 mt-1">Seller must deliver before deadline</div>
                )}
                {room.state === 'Delivered' && (
                  <div className="text-[11px] text-purple-600 mt-1">No action = funds released to seller</div>
                )}
              </div>
            )}

            <ActionPanel
              room={room} id={id} isCreator={isCreator} isSeller={isSeller} isBuyer={isCounter} isAdmin={isAdmin} isParticipant={isParticipant}
              arbiterName={arbiterName} totalUSDC={totalUSDC} joinCode={joinCode} copied={copied}
              proofInput={proofInput} setProofInput={setProofInput}
              canExpire={canExpire} canEscalate={canEscalate} canBuyerRefund={canBuyerRefund}
              handleJoin={handleJoin} handleFund={handleFund} handleDeliver={handleDeliver} handleRelease={handleRelease}
              handleBuyerRefund={handleBuyerRefund} handleCancel={handleCancel} handleLeave={handleLeave} handleExpire={handleExpire}
              handleEscalate={handleEscalate} handleArbRelease={handleArbRelease} handleArbRefund={handleArbRefund} handleArbSplit={handleArbSplit}
              copyInvite={copyInvite}
              showDisputeForm={showDisputeForm} setShowDisputeForm={setShowDisputeForm}
              disputeReason={disputeReason} setDisputeReason={setDisputeReason}
              evidenceType={evidenceType} setEvidenceType={setEvidenceType}
              evidenceDesc={evidenceDesc} setEvidenceDesc={setEvidenceDesc}
              evidenceRef={evidenceRef} setEvidenceRef={setEvidenceRef}
              handleDispute={handleDispute}
              showEvidenceForm={showEvidenceForm} setShowEvidenceForm={setShowEvidenceForm}
              handleSubmitEvidence={handleSubmitEvidence}
              canMutualCancel={canMutualCancel}
              mutualCancelStatus={mutualCancelStatus}
              hasApprovedMutualCancel={hasApprovedMutualCancel}
              counterpartyApprovedMutualCancel={counterpartyApprovedMutualCancel}
              mutualCancelReady={mutualCancelReady}
              handleRequestMutualCancel={handleRequestMutualCancel}
              handleRevokeMutualCancel={handleRevokeMutualCancel}
              handleExecuteMutualCancel={handleExecuteMutualCancel}
              txPending={txPending}
            />

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

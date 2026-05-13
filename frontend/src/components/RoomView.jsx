import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'
import { getContract, getUsdc, waitForTx, ensureArcChain, ARC_GAS, ARC_GAS_APPROVE, STATE_NAMES, CONTRACT_ADDRESS } from '../utils/contract'

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
        state: STATE_NAMES[Number(data.state)],
        value: ethers.formatUnits(data.fundedAmount, 6),
        collateralLocked: data.collateralAmount, // amount set at creation, represents locked collateral
        creatorIsSeller: data.creatorIsSeller,
      })
      try { setArbiterName(await contract.arbiterName()) } catch {}
      try { setArbiterAddr(await contract.arbiter()) } catch {}
    } catch (err) {
      console.error(err)
      setStatus({ type: 'err', msg: 'Room not found' })
    } finally { setLoading(false) }
  }

  useEffect(() => { loadRoom() }, [id, wallet])

  useEffect(() => {
    if (!wallet) return
    const interval = setInterval(() => loadRoom(), 10000)
    return () => clearInterval(interval)
  }, [id, wallet])

  useEffect(() => {
    if (!room || room.state !== 'Delivered' || !room.deliveredAt) return
    const AUTO_RELEASE = 2 * 3600 // 2h matches contract AUTO_RELEASE_TIME
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
  const isArbiter = account === arbiterAddr?.toLowerCase()

  async function doAction(fn, label, successMsg) {
    setStatus({ type: 'info', msg: label })
    try {
      const signer = await wallet.provider.getSigner()
      await ensureArcChain(signer)
      const contract = getContract(signer)
      const tx = await fn(contract)
      console.log('TX sent:', tx.hash)
      setStatus({ type: 'info', msg: `TX pending: ${tx.hash.slice(0, 10)}…` })
      const receipt = await waitForTx(wallet.provider, tx.hash, 120000)
      console.log('TX confirmed in block:', receipt.blockNumber)
      setStatus({ type: 'ok', msg: successMsg })
      loadRoom()
    } catch (err) {
      console.error('TX failed:', err)
      setStatus({ type: 'err', msg: err.reason || err.message })
    }
  }

  const handleJoin = () => {
    if (!joinCode) { setStatus({ type: 'err', msg: 'Invite link missing join code' }); return }
    doAction((c) => c.joinRoom(id, ethers.toUtf8Bytes(joinCode), ARC_GAS), 'Joining…', 'Joined!')
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
      await waitForTx(wallet.provider, approveTx.hash, 60000)

      setStatus({ type: 'info', msg: 'Funding room…' })
      const fundTx = await contract.fundRoom(id, ARC_GAS)
      await waitForTx(wallet.provider, fundTx.hash, 120000)
      setStatus({ type: 'ok', msg: 'Funded!' })
      loadRoom()
    } catch (e) {
      setStatus({ type: 'err', msg: e.reason || e.message })
    }
  }
  const handleDeliver = () => doAction((c) => c.markDelivered(id, ethers.ZeroHash, ARC_GAS), 'Confirming item given…', 'Delivered!')
  const handleRelease = () => doAction((c) => c.releaseFunds(id, ARC_GAS), 'Confirming receipt…', 'Released! Seller gets price + collateral.')
  const handleDispute = () => doAction((c) => c.dispute(id, ARC_GAS), 'Opening dispute…', 'Disputed! Open a Discord ticket for arbiter.')
  const handleCancel = () => doAction((c) => c.cancelRoom(id, ARC_GAS), 'Cancelling…', 'Cancelled. Collateral returned.')
  const handleLeave = () => doAction((c) => c.leaveRoom(id, ARC_GAS), 'Leaving…', 'Left room. Collateral returned.')
  const handleExpire = () => doAction((c) => c.expireRoom(id, ARC_GAS), 'Expiring…', 'Expired. Collateral returned.')
  const handleAutoRelease = () => doAction((c) => c.autoRelease(id, ARC_GAS), 'Auto-releasing…', 'Auto-released! Seller gets price + collateral.')
  const handleArbRelease = () => {
    // Release to seller (not always creator!)
    const seller = room.creatorIsSeller ? room.creator : room.counterparty
    doAction((c) => c.arbiterResolve(id, seller, ARC_GAS), 'Resolving…', 'Released to seller (+ collateral)')
  }
  const handleArbRefund = () => {
    // Refund to buyer (not always counterparty!)
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
    (room.state === 'Created' && (Date.now() / 1000 - room.createdAt) > 3600) ||   // JOIN_DEADLINE = 1h
    (room.state === 'Joined' && (Date.now() / 1000 - room.joinedAt) > 1800)        // FUND_DEADLINE = 30m
  )
  const canAutoRelease = room?.state === 'Delivered' && room.deliveredAt && (Date.now() / 1000 - room.deliveredAt) >= 7200 // AUTO_RELEASE = 2h

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
            <PartyRow label="Creator" address={room.creator} role={room.creatorIsSeller ? 'Seller' : 'Buyer'} isYou={isCreator} />
            {room.counterparty !== '0x0000000000000000000000000000000000000000' ? (
              <PartyRow label="Counter" address={room.counterparty} role={room.creatorIsSeller ? 'Buyer' : 'Seller'} isYou={isCounter} />
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
                <button onClick={handleDispute} className="btn-ghost w-full py-3">Dispute → Discord Ticket</button>
              </>
            )}
            {room.state === 'Delivered' && isCreator && canAutoRelease && (
              <button onClick={handleAutoRelease} className="btn-ghost w-full py-3">⏰ Claim Auto-Release</button>
            )}
            {room.state === 'Delivered' && isCreator && !canAutoRelease && (
              <div className="text-[13px] text-stripe-body dark:text-gray-400 text-center py-1">Waiting for buyer to confirm receipt…</div>
            )}

            {/* DISPUTED */}
            {room.state === 'Disputed' && (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <div className="text-[13px] text-red-700 font-medium text-center mb-1">⚖️ Under Dispute — Fund Frozen</div>
                <div className="text-[12px] text-red-500 text-center mb-3">
                  {arbiterName} will review via Discord ticket and decide on-chain
                </div>
                {isArbiter && (
                  <div className="flex flex-col gap-2">
                    <button onClick={handleArbRelease} className="btn-primary w-full py-2.5 text-[13px]">Release to Seller (price + collateral)</button>
                    <button onClick={handleArbRefund} className="btn-ghost w-full py-2.5 text-[13px]">Refund to Buyer (price + collateral)</button>
                    <button onClick={handleArbSplit} className="btn-ghost w-full py-2.5 text-[13px]">50/50 Split</button>
                  </div>
                )}
                {!isArbiter && (
                  <div className="text-[12px] text-red-500 text-center">
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

function PartyRow({ label, address, role, isYou }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-stripe-border dark:border-white/10 last:border-b-0">
      <div>
        <span className="text-[13px] text-stripe-navy dark:text-white font-mono">{formatAddress(address)}</span>
        {isYou && <span className="ml-2 text-[10px] text-purple-600 font-medium">(you)</span>}
      </div>
      <span className="text-[12px] text-stripe-body dark:text-gray-400">{role}</span>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { ROOM_STATUS, ROOM_BADGE } from '../../lib/contract'
import { formatAddress } from '../../lib/wallet'

export default function RoomView({ roomId, room, token, signerAddress }) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  const ROOM_ADDR = room.target || room.address

  async function loadRoom() {
    try {
      setLoading(true)
      const r = await room.getRoom(roomId)
      setData({
        maker: r.maker,
        counter: r.counter,
        makerIsSeller: r.makerIsSeller,
        item: r.item,
        price: r.price,
        tax: r.tax,
        total: r.total,
        sellerTimeout: r.sellerTimeout,
        autoReleaseDelay: r.autoReleaseDelay,
        status: r.status,
      })
    } catch (e) {
      setStatus({ type: 'err', msg: e.reason || e.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRoom() }, [roomId])

  // ─── Actions ─────────────────────────────────

  async function handleJoin() {
    try {
      setStatus({ type: 'info', msg: 'Joining room…' })
      await (await room.joinRoom(roomId)).wait()
      setStatus({ type: 'ok', msg: 'Joined!' })
      await loadRoom()
    } catch (e) {
      setStatus({ type: 'err', msg: e.reason || e.message })
    }
  }

  async function handleFund() {
    try {
      setStatus({ type: 'info', msg: 'Approving USDC…' })
      const allowance = await token.allowance(signerAddress, ROOM_ADDR)
      if (allowance < data.total) {
        await (await token.approve(ROOM_ADDR, data.total)).wait()
      }
      setStatus({ type: 'info', msg: 'Funding escrow…' })
      await (await room.fundRoom(roomId)).wait()
      setStatus({ type: 'ok', msg: 'Funded!' })
      await loadRoom()
    } catch (e) {
      setStatus({ type: 'err', msg: e.reason || e.message })
    }
  }

  async function handleDeliver() {
    try {
      setStatus({ type: 'info', msg: 'Marking as delivered…' })
      await (await room.markDelivered(roomId)).wait()
      setStatus({ type: 'ok', msg: 'Marked delivered!' })
      await loadRoom()
    } catch (e) {
      setStatus({ type: 'err', msg: e.reason || e.message })
    }
  }

  async function handleRelease() {
    try {
      setStatus({ type: 'info', msg: 'Releasing…' })
      await (await room.releaseRoom(roomId)).wait()
      setStatus({ type: 'ok', msg: 'Released to seller!' })
      await loadRoom()
    } catch (e) {
      setStatus({ type: 'err', msg: e.reason || e.message })
    }
  }

  async function handleAutoRelease() {
    try {
      setStatus({ type: 'info', msg: 'Auto-releasing…' })
      await (await room.autoRelease(roomId)).wait()
      setStatus({ type: 'ok', msg: 'Auto-released!' })
      await loadRoom()
    } catch (e) {
      setStatus({ type: 'err', msg: e.reason || e.message })
    }
  }

  async function handleDispute() {
    try {
      setStatus({ type: 'info', msg: 'Opening dispute…' })
      await (await room.dispute(roomId)).wait()
      setStatus({ type: 'ok', msg: 'Disputed! Seller has 24h to accept.' })
      await loadRoom()
    } catch (e) {
      setStatus({ type: 'err', msg: e.reason || e.message })
    }
  }

  async function handleRefund() {
    try {
      setStatus({ type: 'info', msg: 'Refunding…' })
      await (await room.refundRoom(roomId)).wait()
      setStatus({ type: 'ok', msg: 'Refunded to buyer!' })
      await loadRoom()
    } catch (e) {
      setStatus({ type: 'err', msg: e.reason || e.message })
    }
  }

  async function handleAcceptDispute() {
    try {
      setStatus({ type: 'info', msg: 'Accepting dispute…' })
      await (await room.sellerAcceptDispute(roomId)).wait()
      setStatus({ type: 'ok', msg: 'Dispute accepted, refunded.' })
      await loadRoom()
    } catch (e) {
      setStatus({ type: 'err', msg: e.reason || e.message })
    }
  }

  // ─── Render ─────────────────────────────────

  if (loading) {
    return (
      <div className="card-3d p-8 text-center">
        <div className="text-stripe-body text-[14px]">Loading room…</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="card-3d p-8 text-center">
        <div className="text-red-600 text-[14px]">Room not found</div>
      </div>
    )
  }

  const statusName = ROOM_STATUS[data.status]
  const isMaker = data.maker.toLowerCase() === signerAddress.toLowerCase()
  const isCounter = data.counter.toLowerCase() === signerAddress.toLowerCase()
  const isSeller = data.makerIsSeller
    ? isMaker
    : isCounter
  const isBuyer = data.makerIsSeller
    ? isCounter
    : isMaker
  const counterJoined = data.counter !== '0x0000000000000000000000000000000000000000'
  const priceUSDC = ethers.formatUnits(data.price, 6)
  const taxUSDC = ethers.formatUnits(data.tax, 6)
  const totalUSDC = ethers.formatUnits(data.total, 6)

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setStatus({ type: 'ok', msg: 'Link copied!' })
  }

  function formatSeconds(s) {
    const n = Number(s)
    if (n >= 3600) return `${Math.ceil(n / 3600)}h`
    if (n >= 60) return `${Math.ceil(n / 60)}m`
    return `${n}s`
  }

  return (
    <div className="card-3d p-6">
      {/* Room header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[18px] font-semibold text-stripe-navy mb-1">{data.item}</div>
          <div className="text-[13px] text-stripe-body font-mono">Room #{roomId}</div>
        </div>
        <span className={`px-2.5 py-1 rounded text-[11px] font-semibold tracking-wider border ${ROOM_BADGE[statusName]}`}>
          {statusName}
        </span>
      </div>

      {/* Price breakdown */}
      <div className="bg-stripe-surface border border-stripe-border rounded p-4 mb-5" style={{ boxShadow: '0 2px 6px rgba(50,50,93,0.06)' }}>
        <PriceRow label="Item price" value={`${priceUSDC} USDC`} />
        <PriceRow label="Tax (1%)" value={`${taxUSDC} USDC`} />
        <PriceRow label="Total to fund" value={`${totalUSDC} USDC`} bold />
      </div>

      {/* Timer info */}
      {statusName === 'FUNDED' && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-5 text-[13px] text-amber-800">
          Seller has {formatSeconds(data.sellerTimeout)} to deliver. After that, buyer can refund.
        </div>
      )}
      {statusName === 'DELIVERED' && (
        <div className="bg-purple-50 border border-purple-200 rounded p-3 mb-5 text-[13px] text-purple-800">
          Buyer has {formatSeconds(data.autoReleaseDelay)} to confirm. After that, auto-release kicks in.
          <br/>Dispute window: 2h.
        </div>
      )}

      {/* Parties */}
      <div className="bg-stripe-surface border border-stripe-border rounded p-4 mb-5">
        <div className="text-[10px] font-mono uppercase tracking-[2px] text-stripe-body mb-3">Parties</div>
        <PartyRow label="Maker" address={data.maker} role={data.makerIsSeller ? 'Seller' : 'Buyer'} isYou={isMaker} />
        {counterJoined ? (
          <PartyRow label="Counter" address={data.counter} role={data.makerIsSeller ? 'Buyer' : 'Seller'} isYou={isCounter} />
        ) : (
          <div className="text-[13px] text-stripe-body py-2">Waiting for counter party…</div>
        )}
        <div className="text-[13px] text-stripe-body py-2">
          You are: <span className="font-medium text-stripe-navy">{isSeller ? 'Seller' : 'Buyer'}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 mb-4">
        {/* WAITING: counter joins */}
        {statusName === 'WAITING' && !isMaker && !counterJoined && (
          <button onClick={handleJoin} className="btn-primary w-full py-3">Join Room</button>
        )}

        {/* WAITING + joined: buyer funds */}
        {statusName === 'WAITING' && isBuyer && counterJoined && (
          <button onClick={handleFund} className="btn-primary w-full py-3">Fund {totalUSDC} USDC</button>
        )}

        {/* FUNDED: seller delivers */}
        {statusName === 'FUNDED' && isSeller && (
          <button onClick={handleDeliver} className="btn-primary w-full py-3">Mark Delivered</button>
        )}

        {/* FUNDED: buyer refunds after timeout */}
        {statusName === 'FUNDED' && isBuyer && (
          <button onClick={handleRefund} className="btn-ghost w-full py-3">Refund (after {formatSeconds(data.sellerTimeout)})</button>
        )}

        {/* DELIVERED: buyer confirms */}
        {statusName === 'DELIVERED' && isBuyer && (
          <>
            <button onClick={handleRelease} className="btn-primary w-full py-3">Confirm & Release</button>
            <button onClick={handleDispute} className="btn-ghost w-full py-3">Dispute</button>
          </>
        )}

        {/* DELIVERED: anyone can auto-release */}
        {statusName === 'DELIVERED' && (
          <button onClick={handleAutoRelease} className="btn-ghost w-full py-3 text-[13px]">
            Auto-Release (after {formatSeconds(data.autoReleaseDelay)})
          </button>
        )}

        {/* DISPUTED: seller accepts or buyer refunds after 24h */}
        {statusName === 'DISPUTED' && isSeller && (
          <button onClick={handleAcceptDispute} className="btn-primary w-full py-3">Accept Dispute & Refund</button>
        )}
        {statusName === 'DISPUTED' && isBuyer && (
          <button onClick={handleRefund} className="btn-ghost w-full py-3">Refund (after 24h if seller ignores)</button>
        )}
      </div>

      {/* Copy link */}
      <button onClick={copyLink} className="btn-ghost w-full py-2.5 text-[13px]">Copy Invite Link</button>

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

function PriceRow({ label, value, bold }) {
  return (
    <div className={`flex justify-between text-[13px] py-1.5 ${bold ? 'font-medium' : ''} border-b border-stripe-border last:border-b-0`}>
      <span className="text-stripe-body">{label}</span>
      <span className="text-stripe-navy font-mono" style={{ fontFeatureSettings: '"tnum"' }}>{value}</span>
    </div>
  )
}

function PartyRow({ label, address, role, isYou }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-stripe-border last:border-b-0">
      <div>
        <span className="text-[13px] text-stripe-navy font-mono">{formatAddress(address)}</span>
        {isYou && <span className="ml-2 text-[10px] text-stripe-purple font-medium">(you)</span>}
      </div>
      <span className="text-[12px] text-stripe-body">{role}</span>
    </div>
  )
}

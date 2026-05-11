import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { ROOM_STATUS, ROOM_BADGE } from '../lib/contract'
import { formatAddress } from '../lib/wallet'
import ConnectWallet from './app/ConnectWallet'

export default function RoomsPage({ wallet, connecting, connectError, onConnect }) {
  return (
    <section className="pt-28 pb-32 px-6 min-h-screen">
      <div className="max-w-[700px] mx-auto">
        <div className="font-mono text-[11px] uppercase tracking-[3px] text-stripe-body mb-4">My Rooms</div>
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-[32px] font-light text-stripe-navy mb-1" style={{ letterSpacing: '-0.64px' }}>
              Your escrows.
            </h2>
            <p className="text-[15px] font-light text-stripe-body">
              All rooms you've created or joined.
            </p>
          </div>
          {wallet && (
            <a href="/create" className="btn-primary text-[14px]">
              + New Room
            </a>
          )}
        </div>

        {!wallet ? (
          <ConnectWallet onConnect={onConnect} loading={connecting} error={connectError} />
        ) : (
          <RoomList room={wallet.room} signerAddress={wallet.address} />
        )}
      </div>
    </section>
  )
}

function RoomList({ room, signerAddress }) {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRooms()
  }, [])

  async function loadRooms() {
    try {
      setLoading(true)
      const total = await room.totalRooms()
      console.log('Total rooms:', total.toString())

      const myRooms = []
      // Scan all rooms (reverse order, newest first)
      for (let i = Number(total) - 1; i >= 0; i--) {
        try {
          const r = await room.getRoom(i)
          const addr = signerAddress.toLowerCase()
          const isMaker = r.maker.toLowerCase() === addr
          const isCounter = r.counter.toLowerCase() === addr

          if (isMaker || isCounter) {
            myRooms.push({
              id: i,
              maker: r.maker,
              counter: r.counter,
              makerIsSeller: r.makerIsSeller,
              item: r.item,
              price: r.price,
              tax: r.tax,
              total: r.total,
              status: r.status,
              isMaker,
              isCounter,
              role: isMaker
                ? (r.makerIsSeller ? 'Seller' : 'Buyer')
                : (r.makerIsSeller ? 'Buyer' : 'Seller'),
            })
          }
        } catch {}
      }

      setRooms(myRooms)
    } catch (e) {
      console.error('Load rooms error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card-3d p-8 text-center">
        <div className="text-stripe-body text-[14px]">Loading your rooms…</div>
      </div>
    )
  }

  if (rooms.length === 0) {
    return (
      <div className="card-3d p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-lg bg-stripe-surface border border-stripe-border flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="#64748b" strokeWidth="1.5"/>
            <path d="M12 8v4M12 16h.01" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h3 className="text-[16px] font-medium text-stripe-navy mb-2">No rooms yet</h3>
        <p className="text-[14px] text-stripe-body mb-6">Create your first escrow room to get started.</p>
        <a href="/create" className="btn-primary inline-block">Create Room</a>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {rooms.map((r) => (
        <a
          key={r.id}
          href={`/room/${r.id}`}
          className="card-3d p-5 flex items-center justify-between hover:-translate-y-0.5 transition-all no-underline"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-stripe-navy flex items-center justify-center" style={{ boxShadow: '0 2px 8px rgba(6,27,49,0.3)' }}>
              <span className="text-white text-[12px] font-bold font-mono">#{r.id}</span>
            </div>
            <div>
              <div className="text-[15px] font-semibold text-stripe-navy">{r.item}</div>
              <div className="text-[12px] text-stripe-body mt-0.5">
                {r.role} · {ethers.formatUnits(r.price, 6)} USDC · {formatAddress(r.maker === signerAddress ? r.counter : r.maker)}
              </div>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded text-[10px] font-semibold tracking-wider border ${ROOM_BADGE[ROOM_STATUS[r.status]]}`}>
            {ROOM_STATUS[r.status]}
          </span>
        </a>
      ))}
    </div>
  )
}

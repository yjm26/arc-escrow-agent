import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { getContract, STATE_NAMES } from '../utils/contract'
import { STATE_BADGE, formatAddress, TIMERS } from '../utils/constants'

const API_URL = import.meta.env.VITE_API_URL || 'https://arc-escrow-agent-production.up.railway.app'

export default function RoomsPage({ wallet }) {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [pendingRooms, setPendingRooms] = useState([])

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'closed', label: 'Closed' },
  ]

  const FILTER_MAP = {
    active: ['Created', 'Joined', 'Funded', 'Delivered', 'Disputed'],
    completed: ['Released'],
    closed: ['Refunded', 'Expired', 'Cancelled'],
  }

  useEffect(() => {
    if (!wallet) { setLoading(false); return }
    loadRooms()
    fetchPendingRooms()
    const interval = setInterval(() => { loadRooms(); fetchPendingRooms() }, 10000)
    return () => clearInterval(interval)
  }, [wallet])

  async function fetchPendingRooms() {
    if (!wallet) return
    try {
      const res = await fetch(`${API_URL}/api/room-codes?wallet=${wallet.address}`)
      const data = await res.json()
      // Filter out rooms we've already joined (check on-chain)
      const contract = getContract(wallet.provider)
      const stillPending = []
      for (const rc of data) {
        try {
          const room = await contract.getRoom(rc.roomId)
          // If counterparty is address(0), we haven't joined yet
          if (room.counterparty.toLowerCase() === '0x0000000000000000000000000000000000000000') {
            stillPending.push(rc)
          }
        } catch { stillPending.push(rc) }
      }
      setPendingRooms(stillPending)
    } catch (e) { console.error('Fetch pending rooms:', e) }
  }

  async function handleJoinRoom(roomCode) {
    try {
      const signer = await wallet.provider.getSigner()
      const contract = getContract(signer)
      // Contract expects raw bytes, not hash — it hashes internally
      const codeBytes = ethers.toUtf8Bytes(roomCode.joinCode)
      console.log('Joining room:', roomCode.roomId, 'code:', roomCode.joinCode, 'bytes:', codeBytes)
      const tx = await contract.joinRoom(roomCode.roomId, codeBytes)
      await tx.wait()
      loadRooms()
      fetchPendingRooms()
    } catch (e) {
      console.error('Join room failed:', e)
      alert('Failed to join: ' + (e.reason || e.message))
    }
  }

  async function loadRooms() {
    try {
      setLoading(true)
      const provider = wallet.provider
      const contract = getContract(provider)
      const addr = wallet.address.toLowerCase()

      // Use roomCount — no ENS resolution needed
      const total = await contract.roomCount()
      const myRooms = []

      // Scan all rooms (newest first)
      for (let i = Number(total) - 1; i >= 0; i--) {
        try {
          const r = await contract.getRoom(i)
          const isCreator = r.creator.toLowerCase() === addr
          const isCounter = r.counterparty.toLowerCase() === addr

          if (isCreator || isCounter) {
            const creatorIsSeller = r.creatorIsSeller
            myRooms.push({
              id: i,
              creator: r.creator,
              counterparty: r.counterparty,
              item: r.itemDescription,
              price: ethers.formatUnits(r.priceUSD, 6),
              collateral: ethers.formatUnits(r.collateralAmount, 6),
              state: STATE_NAMES[Number(r.state)],
              collateralAmount: ethers.formatUnits(r.collateralAmount, 6),
              createdAt: Number(r.createdAt),
              joinedAt: Number(r.joinedAt),
              isCreator,
              role: isCreator
                ? (creatorIsSeller ? 'Seller' : 'Buyer')
                : (creatorIsSeller ? 'Buyer' : 'Seller'),
              counter: isCreator ? r.counterparty : r.creator,
            })
          }
        } catch {}
      }
      setRooms(myRooms)

      // Auto-expire stale rooms (fire-and-forget)
      const signer = await wallet.provider.getSigner()
      const writeContract = getContract(signer)
      const now = Math.floor(Date.now() / 1000)
      for (const room of myRooms) {
        if (room.state === 'Created' && (now - room.createdAt) >= TIMERS.joinDeadline) {
          try { await writeContract.expireRoom(room.id) } catch {}
        } else if (room.state === 'Joined' && (now - room.joinedAt) >= TIMERS.fundDeadline) {
          try { await writeContract.expireRoom(room.id) } catch {}
        }
      }
    } catch (e) {
      console.error('Load rooms error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="pt-28 pb-32 px-4 sm:px-6 min-h-screen">
        <div className="max-w-full sm:max-w-[700px] mx-auto">
          <div className="card-3d p-8 text-center">
            <div className="text-stripe-body dark:text-gray-400 text-[14px]">Loading your rooms…</div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="pt-28 pb-32 px-4 sm:px-6 min-h-screen">
      <div className="max-w-full sm:max-w-[700px] mx-auto">
        <div className="font-mono text-[11px] uppercase tracking-[3px] text-stripe-body dark:text-gray-400 mb-4">My Rooms</div>
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-[32px] font-light text-stripe-navy dark:text-white mb-1" style={{ letterSpacing: '-0.64px' }}>
              Your escrows.
            </h2>
            <p className="text-[15px] font-light text-stripe-body dark:text-gray-400">
              All rooms you've created or joined.
            </p>
          </div>
          {wallet && (
            <Link to="/create" className="btn-primary text-[14px]">+ New Room</Link>
          )}
        </div>

        {/* Pending rooms to join */}
        {pendingRooms.length > 0 && (
          <div className="mb-8">
            <div className="font-mono text-[10px] uppercase tracking-[2px] text-amber-600 dark:text-amber-400 mb-3">// rooms waiting for you</div>
            <div className="flex flex-col gap-3">
              {pendingRooms.map((rc) => (
                <div key={rc.roomId} className="card-3d p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-amber-500 flex items-center justify-center">
                      <span className="text-white text-[12px] font-bold font-mono">#{rc.roomId}</span>
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold text-stripe-navy dark:text-white">{rc.item || 'Room #' + rc.roomId}</div>
                      <div className="text-[12px] text-stripe-body dark:text-gray-400 mt-0.5">
                        {rc.price ? `${rc.price} USDC · ` : ''}Waiting for you to join
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinRoom(rc)}
                    className="px-4 py-2 rounded bg-amber-500 text-white text-[13px] font-medium hover:bg-amber-600 transition"
                  >
                    Join Room →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        {rooms.length > 0 && (
          <div className="flex gap-1 mb-6 border border-stripe-border dark:border-white/10 rounded-lg p-1">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex-1 py-2 rounded-md text-[13px] font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-stripe-navy text-white'
                    : 'text-stripe-body dark:text-gray-400 hover:text-stripe-navy dark:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {(() => {
          const filtered = filter === 'all'
            ? rooms
            : rooms.filter(r => FILTER_MAP[filter]?.includes(r.state))

          return filtered.length === 0 ? (
          <div className="card-3d p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-lg border border-stripe-border dark:border-white/10 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="#64748b" strokeWidth="1.5"/>
                <path d="M12 8v4M12 16h.01" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-[16px] font-medium text-stripe-navy dark:text-white mb-2">No rooms yet</h3>
            <p className="text-[14px] text-stripe-body dark:text-gray-400 mb-6">Create your first escrow room to get started.</p>
            <Link to="/create" className="btn-primary inline-block">Create Room</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((r) => (
              <Link
                key={r.id}
                to={`/room/${r.id}`}
                className="card-3d p-5 flex items-center justify-between hover:shadow-md transition-shadow no-underline"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-stripe-navy flex items-center justify-center">
                    <span className="text-white text-[12px] font-bold font-mono">#{r.id}</span>
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-stripe-navy dark:text-white">{r.item}</div>
                    <div className="text-[12px] text-stripe-body dark:text-gray-400 mt-0.5">
                      {r.role} · {r.price} USDC{Number(r.collateral) > 0 ? ` · 🔒 ${r.collateral} collateral` : ''} · {formatAddress(r.counter)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded text-[10px] font-semibold tracking-wider border ${STATE_BADGE[r.state] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                    {r.state}
                  </span>
                  {r.state === 'Released' && <span className="text-[11px] text-emerald-600 font-medium">Success</span>}
                  {r.state === 'Refunded' && <span className="text-[11px] text-orange-600 font-medium">Refunded</span>}
                  {(r.state === 'Expired' || r.state === 'Cancelled') && <span className="text-[11px] text-gray-500 font-medium">Closed</span>}
                  {r.state === 'Disputed' && <span className="text-[11px] text-red-600 font-medium">In Dispute</span>}
                </div>
              </Link>
            ))}
          </div>
        )})()}
      </div>
    </section>
  )
}

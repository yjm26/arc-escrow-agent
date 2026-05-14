import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'
import { getContract, getUsdc, STATE_NAMES, CONTRACT_ADDRESS, ARC_GAS, ARC_GAS_APPROVE, ensureArcChain, waitForTx , parseRoom} from '../utils/contract'
import { STATE_BADGE, formatAddress } from '../utils/constants'

const API_URL = import.meta.env.VITE_API_URL || 'https://arc-escrow-agent-production.up.railway.app'

export default function RoomsPage({ wallet }) {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filter, setFilter] = useState('active')
  const [pendingRooms, setPendingRooms] = useState([])
  const [joinError, setJoinError] = useState('')
  const navigate = useNavigate()

  const FILTERS = [
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
    loadRooms(false)
    fetchPendingRooms()
    const interval = setInterval(() => { loadRooms(true); fetchPendingRooms() }, 30000)
    return () => clearInterval(interval)
  }, [wallet])

  async function fetchPendingRooms() {
    if (!wallet) return
    try {
      const res = await fetch(`${API_URL}/api/room-codes/${wallet.address}`)
      const data = await res.json()
      // Filter out rooms we've already joined (check on-chain)
      const contract = getContract(wallet.provider)
      const stillPending = []
      for (const rc of data) {
        try {
          const room = parseRoom(await contract.rooms(rc.roomId))
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
    setJoinError('')
    if (!roomCode?.roomId || !roomCode?.joinCode) {
      setJoinError('Invalid room code data')
      return
    }
    try {
      // Fetch fresh room code from API to ensure joinCode is still valid
      const res = await fetch(`${API_URL}/api/room-codes?roomId=${roomCode.roomId}`)
      const freshCodes = await res.json()
      const fresh = freshCodes?.[0]
      if (!fresh || !fresh.joinCode) {
        setJoinError('Room code expired or invalid. Please refresh.')
        return
      }
      const signer = await wallet.provider.getSigner()
      await ensureArcChain(signer)
      const addr = await signer.getAddress()
      // Query nonce from PUBLIC RPC to bypass wallet stale cache
      const rpcProvider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network', 5042002)
      let nonce = await rpcProvider.getTransactionCount(addr, 'latest')
      const contract = getContract(signer)
      // Fetch room details to check if collateral is required
      const room = parseRoom(await contract.rooms(fresh.roomId))
      const collateralWei = room.collateralAmount
      const creatorIsSeller = room.creatorIsSeller
      const isCounterpartySeller = !creatorIsSeller
      // If I'm the seller joining, I need to approve collateral first
      if (isCounterpartySeller && collateralWei > 0n) {
        const usdc = getUsdc(signer)
        const allowance = await usdc.allowance(wallet.address, CONTRACT_ADDRESS)
        if (allowance < collateralWei) {
          const approveTx = await usdc.approve(CONTRACT_ADDRESS, collateralWei, { ...ARC_GAS_APPROVE, nonce: nonce++ })
          await waitForTx(wallet.provider, approveTx.hash, 180000)
        }
      }
      const codeBytes = ethers.toUtf8Bytes(fresh.joinCode)
      const tx = await contract.joinRoom(fresh.roomId, codeBytes, { ...ARC_GAS, nonce: nonce++ })
      await waitForTx(wallet.provider, tx.hash, 180000)
      loadRooms(false)
      fetchPendingRooms()
      // Navigate seller to room page after successful join
      navigate(`/room/${fresh.roomId}?code=${fresh.joinCode}`)
    } catch (e) {
      console.error('Join room failed:', e)
      setJoinError('Failed to join: ' + (e.reason || e.message))
    }
  }

  async function loadRooms(background = false) {
    if (!wallet) return
    if (!background) setLoading(true)
    else setIsRefreshing(true)
    try {
      // Use PUBLIC RPC for reads — wallet provider often lags behind latest block
      const rpcProvider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network', 5042002)
      const contract = getContract(rpcProvider)
      const addr = wallet.address.toLowerCase()

      const total = await contract.roomCount()
      const myRooms = []

      for (let i = Number(total) - 1; i >= 0; i--) {
        try {
          const r = parseRoom(await contract.rooms(i))
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
    } catch (e) {
      console.error('Load rooms error:', e)
    } finally {
      if (!background) setLoading(false)
      setIsRefreshing(false)
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
        <div className="font-mono text-[11px] uppercase tracking-[3px] text-stripe-body dark:text-gray-400 mb-4 flex items-center gap-2">
          My Rooms
          {isRefreshing && (
            <span className="inline-block w-2 h-2 rounded-full bg-stripe-navy animate-pulse" title="Refreshing..." />
          )}
        </div>
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
            {joinError && (
              <div className="mb-3 px-4 py-2.5 rounded text-[13px] font-medium border bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20">
                {joinError}
              </div>
            )}
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
                    : 'text-stripe-body dark:text-gray-400 hover:text-stripe-navy dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {(() => {
          const filtered = rooms.filter(r => FILTER_MAP[filter]?.includes(r.state))

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

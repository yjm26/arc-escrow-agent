import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getContract, STATE_NAMES, parseRoom } from '../utils/contract'
import Skeleton from './Skeleton'
import { useSmartPolling } from '../hooks/useSmartPolling'

const API_URL = import.meta.env.VITE_API_URL || 'https://arc-escrow-agent-production.up.railway.app'
const ARBITER_ADDR = '0xB8b4e8E7Ad2651d36b8E0D24B5EF1ae06EE2cC4a'

function fmt(addr) {
  if (!addr || addr === '0x0000000000000000000000000000000000000000') return '\u2014'
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function ArbiterDashboard({ wallet }) {
  const navigate = useNavigate()
  const [disputes, setDisputes] = useState([])
  const [rooms, setRooms] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('open')

  const account = wallet?.address?.toLowerCase()
  const isArbiter = account === ARBITER_ADDR.toLowerCase()

  async function fetchDisputes() {
    try {
      const res = await fetch(`${API_URL}/api/disputes?status=${tab}`)
      const data = await res.json()
      setDisputes(Array.isArray(data) ? data : [])
      setError('')
    } catch (err) {
      setError('Failed to load disputes')
      console.error(err)
    }
  }

  async function fetchRoomDetails(roomId) {
    if (!wallet?.provider || !roomId) return
    try {
      const contract = getContract(wallet.provider)
      const data = parseRoom(await contract.rooms(roomId))
      setRooms(prev => ({
        ...prev,
        [roomId]: {
          id: roomId,
          state: STATE_NAMES[Number(data.state)],
          creator: data.creator,
          counterparty: data.counterparty,
          item: data.itemDescription,
          price: data.priceUSD,
          collateral: data.collateralAmount,
          createdAt: Number(data.createdAt),
          disputedAt: Number(data.disputedAt),
          fundedAmount: data.fundedAmount,
        },
      }))
    } catch (err) {
      console.error('fetchRoom error:', err)
    }
  }

  // Load disputes + room details
  useEffect(() => {
    setLoading(true)
    fetchDisputes().then(() => setLoading(false))
  }, [tab])

  useEffect(() => {
    disputes.forEach(d => {
      if (!rooms[d.roomId]) fetchRoomDetails(d.roomId)
    })
  }, [disputes, wallet?.provider])

  // Smart poll for updates
  useSmartPolling(
    async () => {
      await fetchDisputes()
      disputes.forEach(d => fetchRoomDetails(d.roomId))
    },
    [tab],
    { interval: 15000, enabled: !!wallet }
  )

  async function markResolved(roomId, resolution) {
    try {
      await fetch(`${API_URL}/api/disputes/${roomId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, resolvedBy: wallet.address }),
      })
      await fetchDisputes()
    } catch (err) {
      console.error('Resolve mark failed:', err)
    }
  }

  if (!wallet) {
    return (
      <section className="pt-28 pb-32 px-4 sm:px-6 min-h-screen">
        <div className="max-w-5xl mx-auto text-center">
          <div className="card-3d p-8 max-w-[500px] mx-auto">
            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-stripe-surface dark:bg-white/5 border border-stripe-border dark:border-white/10 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 15v2m0 0v2m0-2h2m-2 0H9m12-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <h2 className="text-[18px] font-medium text-stripe-navy dark:text-white mb-2">Connect Your Wallet</h2>
            <p className="text-[14px] text-stripe-body dark:text-gray-400">Arbiter dashboard requires wallet connection.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="pt-24 pb-32 px-4 sm:px-6 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[3px] text-stripe-body dark:text-gray-500 mb-2">Arbiter</div>
            <h1 className="text-[28px] font-light text-stripe-navy dark:text-white" style={{ letterSpacing: '-0.56px' }}>
              Dispute queue.
            </h1>
            <p className="text-[14px] text-stripe-body dark:text-gray-400 mt-1">
              Review open disputes and resolve on-chain.
            </p>
          </div>
          {!isArbiter && (
            <div className="text-[12px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-1.5 rounded font-medium">
              Read-only \u2014 you are not the assigned arbiter
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('open')}
            className={`text-[12px] font-medium px-4 py-2 rounded border transition ${tab === 'open' ? 'bg-stripe-navy text-white border-stripe-navy' : 'border-stripe-border dark:border-white/10 text-stripe-body dark:text-gray-400 hover:border-stripe-navy dark:hover:border-white'}`}
          >
            Open {disputes.filter(d => d.status === 'open').length > 0 && <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 text-[10px]">{disputes.filter(d => d.status === 'open').length}</span>}
          </button>
          <button
            onClick={() => setTab('resolved')}
            className={`text-[12px] font-medium px-4 py-2 rounded border transition ${tab === 'resolved' ? 'bg-stripe-navy text-white border-stripe-navy' : 'border-stripe-border dark:border-white/10 text-stripe-body dark:text-gray-400 hover:border-stripe-navy dark:hover:border-white'}`}
          >
            Resolved
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded text-[13px] font-medium border bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="card-3d p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-1/3 h-5" />
                <Skeleton className="w-1/4 h-4" />
              </div>
            </div>
            <Skeleton lines={3} />
          </div>
        )}

        {/* Empty */}
        {!loading && disputes.length === 0 && (
          <div className="card-3d p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-lg border border-stripe-border dark:border-white/10 flex items-center justify-center text-2xl">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-stripe-body dark:text-gray-500"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h3 className="text-[16px] font-medium text-stripe-navy dark:text-white mb-2">
              {tab === 'open' ? 'No open disputes' : 'No resolved disputes'}
            </h3>
            <p className="text-[14px] text-stripe-body dark:text-gray-400">
              {tab === 'open' ? 'The queue is clear. Good.' : 'Resolved disputes will appear here.'}
            </p>
          </div>
        )}

        {/* List */}
        {!loading && disputes.length > 0 && (
          <div className="space-y-4">
            {disputes.map(d => {
              const room = rooms[d.roomId]
              return (
                <div key={d.roomId} className="card-3d p-5 transition">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium border bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                          DISPUTED
                        </span>
                        <span className="text-[11px] text-stripe-body dark:text-gray-400">Room #{d.roomId}</span>
                        <span className="text-[11px] text-stripe-body dark:text-gray-500">\u00b7 {timeAgo(d.createdAt)}</span>
                      </div>
                      <h3 className="text-[16px] font-medium text-stripe-navy dark:text-white truncate">
                        {d.item || (room ? room.item : 'Unknown item')}
                      </h3>
                      <div className="text-[13px] text-stripe-body dark:text-gray-400 mt-0.5">
                        {d.price || (room ? room.price : '?')} USDC
                        {Number(d.collateral) > 0 && <span className="ml-2 text-amber-600 dark:text-amber-400">\u00b7 Collateral {d.collateral} USDC</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/room/${d.roomId}`)}
                      className="shrink-0 btn-primary text-[12px] px-4 py-2"
                    >
                      Open Room \u2192
                    </button>
                  </div>

                  {/* Parties */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-[12px]">
                    <div className="bg-gray-50 dark:bg-white/5 rounded p-3 border border-stripe-border/60 dark:border-white/5">
                      <div className="text-[10px] text-stripe-body dark:text-gray-500 uppercase tracking-wider mb-1">Creator</div>
                      <div className="font-mono text-stripe-navy dark:text-white">{fmt(d.creator)}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-white/5 rounded p-3 border border-stripe-border/60 dark:border-white/5">
                      <div className="text-[10px] text-stripe-body dark:text-gray-500 uppercase tracking-wider mb-1">Counterparty</div>
                      <div className="font-mono text-stripe-navy dark:text-white">{fmt(d.counterparty)}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-white/5 rounded p-3 border border-stripe-border/60 dark:border-white/5">
                      <div className="text-[10px] text-stripe-body dark:text-gray-500 uppercase tracking-wider mb-1">Disputed by</div>
                      <div className="font-mono text-stripe-navy dark:text-white">{fmt(d.disputedBy)}</div>
                    </div>
                  </div>

                  {/* Reason & Evidence */}
                  {(d.reason || d.evidenceRef) && (
                    <div className="bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 rounded p-3 mb-4">
                      {d.reason && (
                        <div className="text-[13px] text-red-800 dark:text-red-300 mb-1">
                          <span className="font-medium">Reason:</span> {d.reason}
                        </div>
                      )}
                      {d.evidenceRef && (
                        <div className="text-[12px] text-red-600 dark:text-red-400 font-mono break-all">
                          Evidence: {d.evidenceRef}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chain status */}
                  {room && (
                    <div className="flex items-center gap-2 text-[12px] text-stripe-body dark:text-gray-500">
                      <span className={`w-2 h-2 rounded-full ${room.state === 'Disputed' ? 'bg-red-500' : 'bg-green-500'}`} />
                      On-chain: <span className="font-medium text-stripe-navy dark:text-white">{room.state}</span>
                      {room.disputedAt > 0 && <span>\u00b7 disputed {timeAgo(room.disputedAt * 1000)}</span>}
                    </div>
                  )}

                  {/* Resolve actions (arbiter only) */}
                  {isArbiter && tab === 'open' && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-stripe-border/60 dark:border-white/5">
                      <button
                        onClick={() => navigate(`/room/${d.roomId}`)}
                        className="btn-primary text-[12px] px-4 py-2"
                      >
                        Resolve \u2192
                      </button>
                      <button
                        onClick={() => markResolved(d.roomId, 'dismissed')}
                        className="btn-ghost text-[12px] px-4 py-2 text-stripe-body"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

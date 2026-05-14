import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getContract, STATE_NAMES, parseRoom } from '../utils/contract'
import Skeleton from './Skeleton'
import { useSmartPolling } from '../hooks/useSmartPolling'

const API_URL = import.meta.env.VITE_API_URL || 'https://arc-escrow-agent-production.up.railway.app'
const ARBITER_ADDR = '0xB8b4e8E7Ad2651d36b8E0D24B5EF1ae06EE2cC4a'

function fmt(addr) {
  if (!addr || addr === '0x0000000000000000000000000000000000000000') return '—'
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
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
  const [expanded, setExpanded] = useState(null)

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

  useEffect(() => {
    setLoading(true)
    fetchDisputes().then(() => setLoading(false))
  }, [tab])

  useEffect(() => {
    disputes.forEach(d => {
      if (!rooms[d.roomId]) fetchRoomDetails(d.roomId)
    })
  }, [disputes, wallet?.provider])

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
      <div className="max-w-[1400px] mx-auto">
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
          <div className="flex items-center gap-3">
            {!isArbiter && (
              <div className="text-[12px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-1.5 rounded font-medium">
                Read-only
              </div>
            )}
            <div className="flex gap-2">
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
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded text-[13px] font-medium border bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20">
            {error}
          </div>
        )}

        {/* Loading skeleton cards */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card-3d p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-12 h-5 rounded" />
                  <Skeleton className="w-16 h-4 rounded" />
                </div>
                <Skeleton className="w-3/4 h-6 rounded" />
                <Skeleton className="w-1/2 h-5 rounded" />
                <div className="pt-2 border-t border-stripe-border/40 dark:border-white/5 space-y-2">
                  <Skeleton className="w-full h-4 rounded" />
                  <Skeleton className="w-2/3 h-4 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && disputes.length === 0 && (
          <div className="card-3d p-8 text-center max-w-md mx-auto">
            <div className="w-14 h-14 mx-auto mb-5 rounded-lg border border-stripe-border dark:border-white/10 flex items-center justify-center">
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

        {/* Card grid */}
        {!loading && disputes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {disputes.map(d => {
              const room = rooms[d.roomId]
              return (
                <div
                  key={d.roomId}
                  onClick={() => setExpanded(d)}
                  className="card-3d p-4 cursor-pointer transition hover:shadow-stripe-md"
                >
                  {/* Meta row */}
                  <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                    <span className="px-2 py-[3px] rounded-full text-[10px] font-semibold tracking-wide uppercase bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                      DISPUTED
                    </span>
                    <span className="text-[11px] text-zinc-400 dark:text-gray-500 font-mono">#{d.roomId}</span>
                    <span className="text-[11px] text-zinc-400 dark:text-gray-500 ml-auto">{timeAgo(d.createdAt)}</span>
                  </div>

                  {/* Item */}
                  <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white leading-snug mb-3 tracking-tight line-clamp-2">
                    {d.item || (room ? room.item : 'Unknown item')}
                  </h3>

                  {/* Price row */}
                  <div className="flex items-baseline gap-2 mb-3 pb-3 border-b border-stripe-border/60 dark:border-white/5">
                    <span className="text-[22px] font-semibold text-zinc-900 dark:text-white tracking-tight leading-none font-mono">
                      {d.price || (room ? room.price : '?')}
                    </span>
                    <span className="text-[13px] text-zinc-400 dark:text-gray-500 font-normal">USDC</span>
                    {Number(d.collateral) > 0 && (
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-[3px] rounded-full border border-amber-100 dark:border-amber-500/20 font-mono">
                        🔒 {d.collateral}
                      </span>
                    )}
                  </div>

                  {/* Parties */}
                  <div className="space-y-1.5 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-stripe-body dark:text-gray-500">Creator</span>
                      <span className="font-mono text-stripe-navy dark:text-white">{fmt(d.creator)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stripe-body dark:text-gray-500">Counterparty</span>
                      <span className="font-mono text-stripe-navy dark:text-white">{fmt(d.counterparty)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stripe-body dark:text-gray-500">Disputed by</span>
                      <span className="font-mono text-red-600 dark:text-red-400">{fmt(d.disputedBy)}</span>
                    </div>
                  </div>

                  {/* Chain status pill */}
                  {room && (
                    <div className="mt-3 flex items-center gap-2 text-[11px]">
                      <span className={`w-2 h-2 rounded-full ${room.state === 'Disputed' ? 'bg-red-500' : 'bg-green-500'}`} />
                      <span className="text-stripe-body dark:text-gray-500">On-chain: <span className="font-medium text-stripe-navy dark:text-white">{room.state}</span></span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Expanded detail modal */}
      {expanded && (
        <DisputeDetailModal
          dispute={expanded}
          room={rooms[expanded.roomId]}
          isArbiter={isArbiter}
          onClose={() => setExpanded(null)}
          onNavigate={() => { setExpanded(null); navigate(`/room/${expanded.roomId}`) }}
          onResolve={(res) => { markResolved(expanded.roomId, res); setExpanded(null) }}
        />
      )}
    </section>
  )
}

function DisputeDetailModal({ dispute, room, isArbiter, onClose, onNavigate, onResolve }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-stripe-border dark:border-white/10 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-stripe-border dark:border-white/10 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-[3px] rounded-full text-[10px] font-semibold tracking-wide uppercase bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                DISPUTED
              </span>
              <span className="text-[11px] text-stripe-body dark:text-gray-500 font-mono">Room #{dispute.roomId}</span>
            </div>
            <h2 className="text-[18px] font-semibold text-stripe-navy dark:text-white">
              {dispute.item || (room ? room.item : 'Unknown item')}
            </h2>
          </div>
          <button onClick={onClose} className="shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-stripe-body dark:text-gray-400"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Price & Collateral */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3 border border-stripe-border/40 dark:border-white/5">
              <div className="text-[10px] text-stripe-body dark:text-gray-500 uppercase tracking-wider mb-1">Price</div>
              <div className="text-[16px] font-semibold font-mono text-stripe-navy dark:text-white">{dispute.price || '?'} <span className="text-[11px] font-normal text-stripe-body">USDC</span></div>
            </div>
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3 border border-stripe-border/40 dark:border-white/5">
              <div className="text-[10px] text-stripe-body dark:text-gray-500 uppercase tracking-wider mb-1">Collateral</div>
              <div className="text-[16px] font-semibold font-mono text-stripe-navy dark:text-white">{dispute.collateral || '0'} <span className="text-[11px] font-normal text-stripe-body">USDC</span></div>
            </div>
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3 border border-stripe-border/40 dark:border-white/5">
              <div className="text-[10px] text-stripe-body dark:text-gray-500 uppercase tracking-wider mb-1">Created</div>
              <div className="text-[13px] font-mono text-stripe-navy dark:text-white">{timeAgo(dispute.createdAt)}</div>
            </div>
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3 border border-stripe-border/40 dark:border-white/5">
              <div className="text-[10px] text-stripe-body dark:text-gray-500 uppercase tracking-wider mb-1">On-chain</div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${room?.state === 'Disputed' ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className="text-[13px] font-medium text-stripe-navy dark:text-white">{room?.state || 'Unknown'}</span>
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3 border border-stripe-border/40 dark:border-white/5">
              <div className="text-[10px] text-stripe-body dark:text-gray-500 uppercase tracking-wider mb-1">Creator</div>
              <div className="font-mono text-[13px] text-stripe-navy dark:text-white break-all">{fmt(dispute.creator)}</div>
            </div>
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3 border border-stripe-border/40 dark:border-white/5">
              <div className="text-[10px] text-stripe-body dark:text-gray-500 uppercase tracking-wider mb-1">Counterparty</div>
              <div className="font-mono text-[13px] text-stripe-navy dark:text-white break-all">{fmt(dispute.counterparty)}</div>
            </div>
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3 border border-stripe-border/40 dark:border-white/5">
              <div className="text-[10px] text-stripe-body dark:text-gray-500 uppercase tracking-wider mb-1">Disputed by</div>
              <div className="font-mono text-[13px] text-red-600 dark:text-red-400 break-all">{fmt(dispute.disputedBy)}</div>
            </div>
          </div>

          {/* Reason */}
          {dispute.reason && (
            <div className="bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 rounded-lg p-4">
              <div className="text-[10px] text-red-500 dark:text-red-400 uppercase tracking-wider mb-2 font-medium">Dispute Reason</div>
              <div className="text-[14px] text-red-800 dark:text-red-300 leading-relaxed">
                {dispute.reason}
              </div>
            </div>
          )}

          {/* Evidence / Proof */}
          {dispute.evidenceRef && (
            <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-lg p-4">
              <div className="text-[10px] text-blue-500 dark:text-blue-400 uppercase tracking-wider mb-2 font-medium">Evidence / Proof</div>
              <div className="text-[13px] text-blue-800 dark:text-blue-300 font-mono break-all">
                {dispute.evidenceRef}
              </div>
              {dispute.evidenceRef.startsWith('http') && (
                <a
                  href={dispute.evidenceRef}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1 mt-2 text-[12px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Open evidence link →
                </a>
              )}
            </div>
          )}

          {!dispute.reason && !dispute.evidenceRef && (
            <div className="bg-gray-50 dark:bg-white/5 border border-stripe-border/40 dark:border-white/5 rounded-lg p-4 text-center">
              <div className="text-[13px] text-stripe-body dark:text-gray-400">No reason or evidence provided.</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={onNavigate} className="btn-primary flex-1 py-2.5 text-[13px]">
              Open Room to Resolve →
            </button>
            {isArbiter && (
              <button onClick={() => onResolve('dismissed')} className="btn-ghost py-2.5 text-[13px] px-5">
                Mark Resolved
              </button>
            )}
            <button onClick={onClose} className="btn-ghost py-2.5 text-[13px] px-5">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

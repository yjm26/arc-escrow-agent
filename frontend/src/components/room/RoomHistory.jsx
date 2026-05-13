import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { getContract } from '../../utils/contract'
import { formatAddress } from '../../utils/constants'

const EVENT_CONFIG = {
  RoomCreated: { label: 'Room created', color: 'bg-blue-500', textColor: 'text-blue-700' },
  RoomJoined: { label: 'Counterparty joined', color: 'bg-purple-500', textColor: 'text-purple-700' },
  RoomFunded: { label: 'Escrow funded', color: 'bg-amber-500', textColor: 'text-amber-700' },
  RoomDelivered: { label: 'Item delivered', color: 'bg-green-500', textColor: 'text-green-700' },
  RoomReleased: { label: 'Funds released', color: 'bg-emerald-500', textColor: 'text-emerald-700' },
  RoomDisputed: { label: 'Dispute opened', color: 'bg-red-500', textColor: 'text-red-700' },
  RoomRefunded: { label: 'Buyer refunded', color: 'bg-orange-500', textColor: 'text-orange-700' },
  RoomExpired: { label: 'Room expired', color: 'bg-gray-400', textColor: 'text-gray-600' },
  RoomCancelled: { label: 'Room cancelled', color: 'bg-gray-400', textColor: 'text-gray-600' },
  DisputeResolved: { label: 'Dispute resolved', color: 'bg-red-400', textColor: 'text-red-600' },
}

function formatTimestamp(ts) {
  const d = new Date(ts * 1000)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(ts) {
  const d = new Date(ts * 1000)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function getEventDetail(name, args) {
  switch (name) {
    case 'RoomCreated':
      return `${formatAddress(args.creator)} — ${args.creatorIsSeller ? 'Seller' : 'Buyer'}`
    case 'RoomJoined':
      return formatAddress(args.who)
    case 'RoomFunded':
      return `${Number(ethers.formatUnits(args.amount, 6)).toFixed(2)} USDC`
    case 'RoomDelivered':
      return args.proof && args.proof !== ethers.ZeroHash ? `proof: ${args.proof.slice(0, 10)}…` : 'no proof'
    case 'RoomReleased':
      return `${Number(ethers.formatUnits(args.amount, 6)).toFixed(2)} USDC → seller`
    case 'RoomRefunded':
      return `${Number(ethers.formatUnits(args.amount, 6)).toFixed(2)} USDC → buyer`
    case 'RoomCancelled':
      return `by ${formatAddress(args.by)}`
    case 'DisputeResolved': {
      const amount = Number(ethers.formatUnits(args.amount, 6)).toFixed(2)
      const winner = formatAddress(args.winner)
      return args.winner === ethers.ZeroAddress ? `${amount} USDC → 50/50 split` : `${amount} USDC → ${winner}`
    }
    default:
      return ''
  }
}

export default function RoomHistory({ roomId, provider }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [roomId, provider])

  async function loadHistory() {
    try {
      const contract = getContract(provider)
      const eventNames = Object.keys(EVENT_CONFIG)

      const allEvents = []
      for (const name of eventNames) {
        try {
          const logs = await contract.queryFilter(contract.filters[name](Number(roomId)))
          for (const log of logs) {
            const block = await log.getBlock()
            allEvents.push({
              name,
              args: log.args,
              blockNumber: log.blockNumber,
              timestamp: block.timestamp,
              txHash: log.transactionHash,
            })
          }
        } catch { /* event might not have filter for roomId */ }
      }

      allEvents.sort((a, b) => a.blockNumber - b.blockNumber)
      setEvents(allEvents)
    } catch (err) {
      console.error('History load error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="border border-stripe-border dark:border-white/10 rounded p-4 mb-5">
      <div className="text-[10px] font-mono uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-3">History</div>
      <div className="text-[12px] text-stripe-body dark:text-gray-400">Loading…</div>
    </div>
  )

  if (events.length === 0) return null

  // Group by date
  const grouped = {}
  for (const ev of events) {
    const dateKey = formatDate(ev.timestamp)
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(ev)
  }

  return (
    <div className="border border-stripe-border dark:border-white/10 rounded p-4 mb-5">
      <div className="text-[10px] font-mono uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-3">History</div>
      <div className="space-y-4">
        {Object.entries(grouped).map(([date, dayEvents]) => (
          <div key={date}>
            <div className="text-[10px] font-mono text-stripe-body dark:text-gray-400 mb-2">{date}</div>
            <div className="space-y-0">
              {dayEvents.map((ev, i) => {
                const config = EVENT_CONFIG[ev.name] || { label: ev.name, color: 'bg-gray-400', textColor: 'text-gray-600' }
                const detail = getEventDetail(ev.name, ev.args)
                return (
                  <div key={i} className="flex items-start gap-3 py-1.5">
                    <div className="flex flex-col items-center mt-1">
                      <div className={`w-2 h-2 rounded-full ${config.color}`} />
                      {i < dayEvents.length - 1 && <div className="w-px h-4 bg-stripe-border mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`text-[12px] font-medium ${config.textColor}`}>{config.label}</span>
                        <span className="text-[10px] font-mono text-stripe-body dark:text-gray-400 shrink-0">{formatTimestamp(ev.timestamp)}</span>
                      </div>
                      {detail && <div className="text-[11px] text-stripe-body dark:text-gray-400 font-mono mt-0.5">{detail}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'https://arc-escrow-agent-production.up.railway.app'

export default function Offers({ wallet }) {
  const navigate = useNavigate()
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('incoming') // incoming | sent
  const [counterModal, setCounterModal] = useState(null) // offer to counter
  const [counterPrice, setCounterPrice] = useState('')
  const [counterMsg, setCounterMsg] = useState('')

  const fetchOffers = useCallback(async () => {
    if (!wallet) return
    try {
      const res = await fetch(`${API_URL}/api/offers?wallet=${wallet.address}`)
      const data = await res.json()
      setOffers(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [wallet])

  useEffect(() => {
    fetchOffers()
    const interval = setInterval(fetchOffers, 10000)
    return () => clearInterval(interval)
  }, [fetchOffers])

  const handleAccept = async (offer) => {
    try {
      await fetch(`${API_URL}/api/offers/${offer.id}/accept`, { method: 'PUT' })
      // Navigate to create room with offer details
      navigate(`/create?item=${encodeURIComponent(offer.listingTitle)}&price=${offer.offerPrice}&collateral=${offer.collateral}&creatorIsSeller=${offer.listingRole === 'buyer'}&counterparty=${offer.offererWallet}`)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDecline = async (offer) => {
    try {
      await fetch(`${API_URL}/api/offers/${offer.id}/decline`, { method: 'PUT' })
      fetchOffers()
    } catch (err) {
      console.error(err)
    }
  }

  const handleCounter = async () => {
    if (!counterModal || !counterPrice) return
    try {
      await fetch(`${API_URL}/api/offers/${counterModal.id}/counter`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counterPrice, counterMessage: counterMsg }),
      })
      setCounterModal(null)
      setCounterPrice('')
      setCounterMsg('')
      fetchOffers()
    } catch (err) {
      console.error(err)
    }
  }

  if (!wallet) {
    return (
      <div className="max-w-[600px] mx-auto px-6 pt-28 pb-16 text-center">
        <p className="text-zinc-500 dark:text-gray-400">Connect wallet to view offers</p>
      </div>
    )
  }

  const incoming = offers.filter(o => o.listingCreator.toLowerCase() === wallet.address.toLowerCase())
  const sent = offers.filter(o => o.offererWallet.toLowerCase() === wallet.address.toLowerCase())
  const displayed = tab === 'incoming' ? incoming : sent

  const statusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-amber-600 dark:text-amber-400'
      case 'accepted': return 'text-emerald-600 dark:text-emerald-400'
      case 'declined': return 'text-red-500 dark:text-red-400'
      case 'countered': return 'text-blue-600 dark:text-blue-400'
      default: return 'text-zinc-500'
    }
  }

  return (
    <div className="max-w-[600px] mx-auto px-6 pt-28 pb-16">
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-zinc-400 mb-4">OFFERS</div>
      <h2 className="text-[22px] font-semibold text-zinc-900 dark:text-white mb-6">Your Offers</h2>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-100 dark:bg-white/5 rounded-md p-1">
        <button
          onClick={() => setTab('incoming')}
          className={`flex-1 py-2 rounded text-[13px] font-medium transition ${tab === 'incoming' ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-gray-400'}`}
        >
          Incoming {incoming.length > 0 && `(${incoming.filter(o => o.status === 'pending').length})`}
        </button>
        <button
          onClick={() => setTab('sent')}
          className={`flex-1 py-2 rounded text-[13px] font-medium transition ${tab === 'sent' ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-gray-400'}`}
        >
          Sent {sent.length > 0 && `(${sent.filter(o => o.status === 'pending').length})`}
        </button>
      </div>

      {loading && <p className="text-zinc-400 text-center py-8">Loading…</p>}

      {!loading && displayed.length === 0 && (
        <div className="text-center py-12 text-zinc-400">
          <p className="text-[14px]">No {tab} offers</p>
        </div>
      )}

      <div className="space-y-3">
        {displayed.map(offer => (
          <div key={offer.id} className="bg-white dark:bg-[#1a1d2e] border border-zinc-200 dark:border-white/10 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-[14px] font-medium text-zinc-900 dark:text-white">{offer.listingTitle || 'Untitled'}</div>
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  {tab === 'incoming'
                    ? `From ${offer.offererWallet.slice(0, 6)}…${offer.offererWallet.slice(-4)}`
                    : `To ${offer.listingCreator.slice(0, 6)}…${offer.listingCreator.slice(-4)}`
                  }
                </div>
              </div>
              <span className={`text-[12px] font-mono font-medium ${statusColor(offer.status)}`}>
                {offer.status}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="text-[15px] font-mono font-semibold text-zinc-900 dark:text-white">
                {offer.offerPrice} USDC
              </div>
              {offer.type === 'accept' && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-mono">
                  ✓ ACCEPTED PRICE
                </span>
              )}
              {offer.type === 'counter' && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-mono">
                  ↳ COUNTER OFFER
                </span>
              )}
            </div>

            {offer.message && (
              <p className="text-[12px] text-zinc-500 dark:text-gray-400 italic mb-3">"{offer.message}"</p>
            )}

            {offer.status === 'countered' && offer.counterPrice && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2.5 mb-3 text-[12px]">
                <span className="text-blue-700 dark:text-blue-300 font-medium">Counter: {offer.counterPrice} USDC</span>
                {offer.counterMessage && <span className="text-blue-500 dark:text-blue-400 ml-2">"{offer.counterMessage}"</span>}
              </div>
            )}

            {/* Actions for incoming pending offers */}
            {tab === 'incoming' && offer.status === 'pending' && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-100 dark:border-white/5">
                <button
                  onClick={() => handleAccept(offer)}
                  className="flex-1 py-2 rounded bg-zinc-900 dark:bg-white text-white dark:text-[#0c0f1a] text-[13px] font-medium hover:bg-zinc-800 dark:hover:bg-gray-200 transition"
                >
                  {offer.type === 'accept' ? 'Accept & Create Room →' : 'Accept Offer →'}
                </button>
                <button
                  onClick={() => { setCounterModal(offer); setCounterPrice(offer.offerPrice) }}
                  className="px-4 py-2 rounded border border-zinc-200 dark:border-white/10 text-[13px] text-zinc-600 dark:text-gray-300 hover:bg-zinc-50 dark:hover:bg-white/5 transition"
                >
                  Counter
                </button>
                <button
                  onClick={() => handleDecline(offer)}
                  className="px-4 py-2 rounded text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                >
                  Decline
                </button>
              </div>
            )}

            {/* Actions for sent countered offers */}
            {tab === 'sent' && offer.status === 'countered' && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-100 dark:border-white/5">
                <button
                  onClick={() => handleAccept(offer)}
                  className="flex-1 py-2 rounded bg-zinc-900 dark:bg-white text-white dark:text-[#0c0f1a] text-[13px] font-medium hover:bg-zinc-800 dark:hover:bg-gray-200 transition"
                >
                  Accept {offer.counterPrice} USDC →
                </button>
                <button
                  onClick={() => handleDecline(offer)}
                  className="px-4 py-2 rounded text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                >
                  Decline
                </button>
              </div>
            )}

            <div className="text-[10px] text-zinc-400 font-mono mt-2">
              {new Date(offer.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Counter modal */}
      {counterModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setCounterModal(null)}>
          <div className="bg-white dark:bg-[#1a1d2e] rounded-lg border border-zinc-200 dark:border-white/10 shadow-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="font-mono text-[10px] uppercase tracking-[2px] text-zinc-400 mb-3">COUNTER OFFER</div>
            <div className="mb-4">
              <label className="text-[12px] text-zinc-500 block mb-1">Your counter price</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={counterPrice}
                  onChange={e => setCounterPrice(e.target.value)}
                  className="stripe-input w-full pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400 font-mono">USDC</span>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-[12px] text-zinc-500 block mb-1">Message</label>
              <textarea
                value={counterMsg}
                onChange={e => setCounterMsg(e.target.value)}
                rows={2}
                className="stripe-input w-full resize-none"
                placeholder="gw mau di harga segini"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCounterModal(null)} className="flex-1 py-2 rounded border border-zinc-200 dark:border-white/10 text-[13px] text-zinc-600 dark:text-gray-400">Cancel</button>
              <button onClick={handleCounter} className="flex-1 py-2 rounded bg-zinc-900 dark:bg-white text-white dark:text-[#0c0f1a] text-[13px] font-medium">Send Counter →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

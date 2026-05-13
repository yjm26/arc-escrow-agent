import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function fmt(addr) {
  if (!addr) return '—'
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

const STATUS_STYLE = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  accepted: 'bg-green-50 text-green-700 border-green-200',
  declined: 'bg-red-50 text-red-700 border-red-200',
  countered: 'bg-blue-50 text-blue-700 border-blue-200',
}

export default function OffersPanel({ wallet, API_URL }) {
  const navigate = useNavigate()
  const [offers, setOffers] = useState([])
  const [tab, setTab] = useState('incoming')
  const [counterTarget, setCounterTarget] = useState(null)
  const [counterPrice, setCounterPrice] = useState('')
  const [counterMsg, setCounterMsg] = useState('')

  async function fetchOffers() {
    if (!wallet?.address) return
    try {
      const res = await fetch(`${API_URL}/api/offers?wallet=${wallet.address}`)
      const data = await res.json()
      setOffers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch offers:', err)
    }
  }

  useEffect(() => { fetchOffers() }, [wallet?.address])

  useEffect(() => {
    if (!wallet?.address) return
    const i = setInterval(fetchOffers, 10000)
    return () => clearInterval(i)
  }, [wallet?.address])

  const incoming = offers.filter(o => o.listingCreator.toLowerCase() === wallet.address.toLowerCase())
  const outgoing = offers.filter(o => o.offererWallet.toLowerCase() === wallet.address.toLowerCase())
  const displayed = tab === 'incoming' ? incoming : outgoing

  async function accept(offerId) {
    try {
      await fetch(`${API_URL}/api/offers/${offerId}/accept`, { method: 'PUT' })
      fetchOffers()
    } catch (err) { console.error(err) }
  }

  async function decline(offerId) {
    try {
      await fetch(`${API_URL}/api/offers/${offerId}/decline`, { method: 'PUT' })
      fetchOffers()
    } catch (err) { console.error(err) }
  }

  async function submitCounter(offerId) {
    try {
      await fetch(`${API_URL}/api/offers/${offerId}/counter`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counterPrice, counterMessage: counterMsg }),
      })
      setCounterTarget(null)
      setCounterPrice('')
      setCounterMsg('')
      fetchOffers()
    } catch (err) { console.error(err) }
  }

  // Open room — determines correct role & collateral based on who's clicking
  // When OUTGOING offer (I'm the offerer):
  //   - listing.role === 'seller' → offerer is BUYER → creatorIsSeller=false, collateral=0
  //   - listing.role === 'buyer'  → offerer is SELLER → creatorIsSeller=true, collateral from listing
  // When INCOMING offer (I'm the listing creator):
  //   - listing.role === 'seller' → I'm SELLER → creatorIsSeller=true, collateral from listing
  //   - listing.role === 'buyer'  → I'm BUYER → creatorIsSeller=false, collateral=0
  function openRoom(offer, isOutgoing) {
    const iAmSeller = isOutgoing
      ? offer.listingRole === 'buyer'
      : offer.listingRole === 'seller'
    const collateral = iAmSeller ? (offer.collateral || '0') : '0'
    const counterparty = isOutgoing ? offer.listingCreator : offer.offererWallet
    navigate(`/create?item=${encodeURIComponent(offer.listingTitle)}&price=${offer.offerPrice || offer.counterPrice}&collateral=${collateral}&creatorIsSeller=${iAmSeller}&counterparty=${counterparty}&listingId=${offer.listingId || offer.listing_id || ''}&deliveryDays=${offer.deliveryDays || 5}`)
  }

  return (
    <div className="card-3d mt-8">
      <div className="p-5 border-b border-zinc-100 dark:border-white/10">
        <div className="font-mono text-[10px] uppercase tracking-[2px] text-zinc-400 mb-3">// your offers</div>
        <div className="flex gap-2">
          <button onClick={() => setTab('incoming')} className={`text-[12px] font-mono px-3 py-1.5 rounded border transition ${tab === 'incoming' ? 'bg-zinc-900 text-zinc-100 border-zinc-700' : 'border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-gray-400 hover:border-zinc-400'}`}>
            Incoming {incoming.length > 0 && <span className="ml-1 bg-yellow-400 text-zinc-900 rounded-full px-1.5 text-[10px]">{incoming.filter(o => o.status === 'pending').length}</span>}
          </button>
          <button onClick={() => setTab('outgoing')} className={`text-[12px] font-mono px-3 py-1.5 rounded border transition ${tab === 'outgoing' ? 'bg-zinc-900 text-zinc-100 border-zinc-700' : 'border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-gray-400 hover:border-zinc-400'}`}>
            Outgoing
          </button>
        </div>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-white/10">
        {displayed.length === 0 && (
          <div className="p-6 text-center text-[13px] text-zinc-400 font-mono">
            {tab === 'incoming' ? 'no incoming offers yet' : 'you haven\'t made any offers yet'}
          </div>
        )}

        {displayed.map(offer => (
          <div key={offer.id} className="p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${STATUS_STYLE[offer.status]}`}>
                    {offer.status.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">{timeAgo(offer.createdAt)}</span>
                </div>
                <h4 className="text-[13px] font-medium text-zinc-900 dark:text-white truncate">{offer.listingTitle}</h4>
                <div className="text-[12px] text-zinc-500 dark:text-gray-400 font-mono mt-0.5">
                  {tab === 'incoming' ? `from ${fmt(offer.offererWallet)}` : `to ${fmt(offer.listingCreator)}`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[16px] font-semibold text-zinc-900 dark:text-white font-mono">{offer.offerPrice}</div>
                <div className="text-[10px] text-zinc-400 font-mono">USDC</div>
              </div>
            </div>

            {offer.message && (
              <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded p-2 mb-2 text-[12px] text-zinc-600 dark:text-gray-300 font-mono">
                "{offer.message}"
              </div>
            )}

            {offer.status === 'countered' && offer.counterPrice && (
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded p-2 mb-2">
                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono uppercase tracking-wider mb-0.5">counter-offer</div>
                <div className="text-[14px] font-semibold text-blue-900 dark:text-blue-300 font-mono">{offer.counterPrice} USDC</div>
                {offer.counterMessage && <div className="text-[12px] text-blue-700 dark:text-blue-400 font-mono mt-0.5">"{offer.counterMessage}"</div>}
              </div>
            )}

            <div className="flex gap-2 mt-2">
              {/* INCOMING: pending */}
              {tab === 'incoming' && offer.status === 'pending' && (
                <>
                  <button onClick={() => accept(offer.id)} className="px-3 py-1.5 rounded bg-green-600 text-white text-[12px] font-medium hover:bg-green-700 transition">
                    Accept
                  </button>
                  <button onClick={() => { setCounterTarget(offer); setCounterPrice(offer.offerPrice); setCounterMsg('') }} className="px-3 py-1.5 rounded border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 text-[12px] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition">
                    Counter
                  </button>
                  <button onClick={() => decline(offer.id)} className="px-3 py-1.5 rounded border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-gray-400 text-[12px] hover:bg-zinc-50 dark:hover:bg-white/5 transition">
                    Decline
                  </button>
                </>
              )}

              {/* INCOMING: countered */}
              {tab === 'incoming' && offer.status === 'countered' && (
                <>
                  <button onClick={() => accept(offer.id)} className="px-3 py-1.5 rounded bg-green-600 text-white text-[12px] font-medium hover:bg-green-700 transition">
                    Accept {offer.counterPrice} USDC
                  </button>
                  <button onClick={() => { setCounterTarget(offer); setCounterPrice(offer.counterPrice); setCounterMsg('') }} className="px-3 py-1.5 rounded border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 text-[12px] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition">
                    Counter again
                  </button>
                  <button onClick={() => decline(offer.id)} className="px-3 py-1.5 rounded border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-gray-400 text-[12px] hover:bg-zinc-50 dark:hover:bg-white/5 transition">
                    Decline
                  </button>
                </>
              )}

              {/* INCOMING: accepted → Create Room button for listing creator too */}
              {tab === 'incoming' && offer.status === 'accepted' && (
                <button onClick={() => openRoom(offer, false)} className="px-4 py-1.5 rounded bg-zinc-900 dark:bg-white dark:text-[#0c0f1a] text-white text-[12px] font-medium hover:bg-zinc-800 dark:hover:bg-gray-200 transition">
                  Create Room →
                </button>
              )}

              {/* OUTGOING: accepted */}
              {tab === 'outgoing' && offer.status === 'accepted' && (
                <button onClick={() => openRoom(offer, true)} className="px-4 py-1.5 rounded bg-zinc-900 dark:bg-white dark:text-[#0c0f1a] text-white text-[12px] font-medium hover:bg-zinc-800 dark:hover:bg-gray-200 transition">
                  Create Room →
                </button>
              )}

              {/* OUTGOING: countered */}
              {tab === 'outgoing' && offer.status === 'countered' && (
                <>
                  <button onClick={() => { accept(offer.id) }} className="px-3 py-1.5 rounded bg-green-600 text-white text-[12px] font-medium hover:bg-green-700 transition">
                    Accept {offer.counterPrice} USDC
                  </button>
                  <button onClick={() => { setCounterTarget(offer); setCounterPrice(offer.counterPrice || offer.offerPrice); setCounterMsg('') }} className="px-3 py-1.5 rounded border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 text-[12px] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition">
                    Counter back
                  </button>
                  <button onClick={() => decline(offer.id)} className="px-3 py-1.5 rounded border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-gray-400 text-[12px] hover:bg-zinc-50 dark:hover:bg-white/5 transition">
                    Walk away
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Counter modal */}
      {counterTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setCounterTarget(null)}>
          <div className="bg-white dark:bg-[#1a1d2e] rounded-lg border border-zinc-200 dark:border-white/10 shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-zinc-100 dark:border-white/10">
              <div className="font-mono text-[10px] uppercase tracking-[2px] text-zinc-400 mb-1">// counter offer</div>
              <h4 className="text-[14px] font-medium text-zinc-900 dark:text-white">{counterTarget.listingTitle}</h4>
            </div>
            <div className="p-4">
              <div className="mb-3">
                <label className="font-mono text-[10px] uppercase tracking-[2px] text-zinc-400 block mb-1">Counter price</label>
                <div className="relative">
                  <input type="number" step="0.01" min="0.01" value={counterPrice} onChange={e => setCounterPrice(e.target.value)} className="stripe-input w-full pr-14" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400 font-mono">USDC</span>
                </div>
              </div>
              <div className="mb-4">
                <label className="font-mono text-[10px] uppercase tracking-[2px] text-zinc-400 block mb-1">Message</label>
                <textarea value={counterMsg} onChange={e => setCounterMsg(e.target.value)} rows={2} className="stripe-input w-full resize-none" placeholder="gw counter segini, deal?" maxLength={200} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCounterTarget(null)} className="flex-1 py-2 rounded border border-zinc-200 dark:border-white/10 text-[13px] text-zinc-600 dark:text-gray-400 hover:bg-zinc-50 dark:hover:bg-white/5 transition">Cancel</button>
                <button onClick={() => submitCounter(counterTarget.id)} disabled={!counterPrice || Number(counterPrice) <= 0} className="flex-1 py-2 rounded bg-blue-600 text-white text-[13px] font-medium hover:bg-blue-700 transition disabled:opacity-40">Counter →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { useOffers } from '../hooks/useOffers'

export default function OffersPanel({ wallet, API_URL }) {
  const navigate = useNavigate()
  const {
    tab, setTab, incoming, outgoing, displayed,
    counterTarget, setCounterTarget,
    counterPrice, setCounterPrice,
    counterMsg, setCounterMsg,
    accept, decline, submitCounter, openRoom, startCounter,
    timeAgo, fmt, STATUS_STYLE,
  } = useOffers(wallet, API_URL, navigate, { defaultTab: 'incoming' })

  const isOutgoing = tab === 'outgoing'

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
            {tab === 'incoming' ? 'no incoming offers yet' : "you haven't made any offers yet"}
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
                  <button onClick={() => accept(offer.id)} className="px-3 py-1.5 rounded bg-green-600 text-white text-[12px] font-medium hover:bg-green-700 transition">Accept</button>
                  <button onClick={() => startCounter(offer, offer.offerPrice)} className="px-3 py-1.5 rounded border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 text-[12px] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition">Counter</button>
                  <button onClick={() => decline(offer.id)} className="px-3 py-1.5 rounded border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-gray-400 text-[12px] hover:bg-zinc-50 dark:hover:bg-white/5 transition">Decline</button>
                </>
              )}

              {/* INCOMING: countered */}
              {tab === 'incoming' && offer.status === 'countered' && (
                <>
                  <button onClick={() => accept(offer.id)} className="px-3 py-1.5 rounded bg-green-600 text-white text-[12px] font-medium hover:bg-green-700 transition">Accept {offer.counterPrice} USDC</button>
                  <button onClick={() => startCounter(offer, offer.counterPrice)} className="px-3 py-1.5 rounded border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 text-[12px] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition">Counter again</button>
                  <button onClick={() => decline(offer.id)} className="px-3 py-1.5 rounded border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-gray-400 text-[12px] hover:bg-zinc-50 dark:hover:bg-white/5 transition">Decline</button>
                </>
              )}

              {/* INCOMING: accepted */}
              {tab === 'incoming' && offer.status === 'accepted' && (
                <button onClick={() => openRoom(offer, false)} className="px-4 py-1.5 rounded bg-zinc-900 dark:bg-white dark:text-[#0c0f1a] text-white text-[12px] font-medium hover:bg-zinc-800 dark:hover:bg-gray-200 transition">Create Room &rarr;</button>
              )}

              {/* OUTGOING: accepted */}
              {tab === 'outgoing' && offer.status === 'accepted' && (
                <button onClick={() => openRoom(offer, true)} className="px-4 py-1.5 rounded bg-zinc-900 dark:bg-white dark:text-[#0c0f1a] text-white text-[12px] font-medium hover:bg-zinc-800 dark:hover:bg-gray-200 transition">Create Room &rarr;</button>
              )}

              {/* OUTGOING: countered */}
              {tab === 'outgoing' && offer.status === 'countered' && (
                <>
                  <button onClick={() => accept(offer.id)} className="px-3 py-1.5 rounded bg-green-600 text-white text-[12px] font-medium hover:bg-green-700 transition">Accept {offer.counterPrice} USDC</button>
                  <button onClick={() => startCounter(offer, offer.counterPrice || offer.offerPrice)} className="px-3 py-1.5 rounded border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 text-[12px] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition">Counter back</button>
                  <button onClick={() => decline(offer.id)} className="px-3 py-1.5 rounded border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-gray-400 text-[12px] hover:bg-zinc-50 dark:hover:bg-white/5 transition">Walk away</button>
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
                <button onClick={() => submitCounter(counterTarget.id)} disabled={!counterPrice || Number(counterPrice) <= 0} className="flex-1 py-2 rounded bg-blue-600 text-white text-[13px] font-medium hover:bg-blue-700 transition disabled:opacity-40">Counter &rarr;</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { useOffers } from '../hooks/useOffers'

export default function Offers({ wallet, API_URL }) {
  const navigate = useNavigate()
  const {
    tab, setTab, incoming, outgoing, displayed,
    counterTarget, setCounterTarget,
    counterPrice, setCounterPrice,
    counterMsg, setCounterMsg,
    accept, decline, submitCounter, openRoom, startCounter,
    timeAgo, fmt, STATUS_STYLE,
  } = useOffers(wallet, API_URL, navigate, { defaultTab: 'incoming' })

  return (
    <div className="max-w-3xl mx-auto px-6 pt-10 pb-16">
      <div className="text-center mb-8">
        <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body mb-2">// offers</div>
        <h1 className="text-[28px] font-semibold text-stripe-navy dark:text-white leading-tight">Offers</h1>
      </div>

      <div className="card-3d">
        <div className="p-5 border-b border-stripe-border dark:border-white/10">
          <div className="flex gap-2">
            <button onClick={() => setTab('incoming')} className={`text-[12px] font-medium px-4 py-2 rounded border transition ${tab === 'incoming' ? 'bg-stripe-navy text-white border-stripe-navy' : 'border-stripe-border dark:border-white/10 text-stripe-body dark:text-gray-400 hover:border-stripe-navy dark:hover:border-white'}`}>
              Incoming {incoming.length > 0 && <span className="ml-1 bg-yellow-400 text-stripe-navy rounded-full px-1.5 text-[10px]">{incoming.filter(o => o.status === 'pending').length}</span>}
            </button>
            <button onClick={() => setTab('sent')} className={`text-[12px] font-medium px-4 py-2 rounded border transition ${tab === 'sent' ? 'bg-stripe-navy text-white border-stripe-navy' : 'border-stripe-border dark:border-white/10 text-stripe-body dark:text-gray-400 hover:border-stripe-navy dark:hover:border-white'}`}>
              Sent
            </button>
          </div>
        </div>

        <div className="divide-y divide-stripe-border dark:divide-white/10">
          {displayed.length === 0 && (
            <div className="p-8 text-center">
              <div className="text-[13px] text-stripe-body dark:text-gray-400">No offers yet.</div>
              <div className="text-[12px] text-stripe-body dark:text-gray-500 mt-1">Make or receive offers on the marketplace.</div>
            </div>
          )}

          {displayed.map(offer => (
            <div key={offer.id} className="p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${STATUS_STYLE[offer.status]}`}>
                      {offer.status.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-stripe-body dark:text-gray-400">{timeAgo(offer.createdAt)}</span>
                  </div>
                  <h4 className="text-[14px] font-medium text-stripe-navy dark:text-white">{offer.listingTitle}</h4>
                  <div className="text-[12px] text-stripe-body dark:text-gray-400 mt-0.5">
                    {tab === 'incoming' ? `From ${fmt(offer.offererWallet)}` : `To ${fmt(offer.listingCreator)}`}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[18px] font-semibold text-stripe-navy dark:text-white font-mono">{offer.offerPrice}</div>
                  <div className="text-[10px] text-stripe-body dark:text-gray-400">USDC</div>
                </div>
              </div>

              {offer.message && (
                <div className="bg-gray-50 dark:bg-white/5 border border-stripe-border dark:border-white/10 rounded p-3 mb-3 text-[13px] text-stripe-body dark:text-gray-300">
                  &ldquo;{offer.message}&rdquo;
                </div>
              )}

              {offer.status === 'countered' && offer.counterPrice && (
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded p-3 mb-3">
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wider mb-0.5">Counter-offer</div>
                  <div className="text-[16px] font-semibold text-blue-900 dark:text-blue-300 font-mono">{offer.counterPrice} USDC</div>
                  {offer.counterMessage && <div className="text-[13px] text-blue-700 dark:text-blue-400 mt-0.5">&ldquo;{offer.counterMessage}&rdquo;</div>}
                </div>
              )}

              <div className="flex gap-2">
                {tab === 'incoming' && offer.status === 'pending' && (
                  <>
                    <button onClick={() => accept(offer.id)} className="btn-primary text-[12px] px-4 py-2">Accept</button>
                    <button onClick={() => startCounter(offer, offer.offerPrice)} className="btn-ghost text-[12px] px-4 py-2">Counter</button>
                    <button onClick={() => decline(offer.id)} className="btn-ghost text-[12px] px-4 py-2 text-red-600">Decline</button>
                  </>
                )}

                {tab === 'incoming' && offer.status === 'countered' && (
                  <>
                    <button onClick={() => accept(offer.id)} className="btn-primary text-[12px] px-4 py-2">Accept {offer.counterPrice} USDC</button>
                    <button onClick={() => startCounter(offer, offer.counterPrice)} className="btn-ghost text-[12px] px-4 py-2">Counter again</button>
                    <button onClick={() => decline(offer.id)} className="btn-ghost text-[12px] px-4 py-2 text-red-600">Decline</button>
                  </>
                )}

                {tab === 'incoming' && offer.status === 'accepted' && (
                  <button onClick={() => openRoom(offer, false)} className="btn-primary text-[12px] px-4 py-2">Create Room &rarr;</button>
                )}

                {tab === 'sent' && offer.status === 'accepted' && (
                  <button onClick={() => openRoom(offer, true)} className="btn-primary text-[12px] px-4 py-2">Create Room &rarr;</button>
                )}

                {tab === 'sent' && offer.status === 'countered' && (
                  <>
                    <button onClick={() => accept(offer.id)} className="btn-primary text-[12px] px-4 py-2">Accept {offer.counterPrice} USDC</button>
                    <button onClick={() => startCounter(offer, offer.counterPrice || offer.offerPrice)} className="btn-ghost text-[12px] px-4 py-2">Counter back</button>
                    <button onClick={() => decline(offer.id)} className="btn-ghost text-[12px] px-4 py-2 text-red-600">Walk away</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Counter modal */}
      {counterTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setCounterTarget(null)}>
          <div className="bg-white dark:bg-[#1a1d2e] rounded-lg border border-stripe-border dark:border-white/10 shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-stripe-border dark:border-white/10">
              <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body mb-1">// counter offer</div>
              <h4 className="text-[14px] font-medium text-stripe-navy dark:text-white">{counterTarget.listingTitle}</h4>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body block mb-1">Counter price</label>
                <div className="relative">
                  <input type="number" step="0.01" min="0.01" value={counterPrice} onChange={e => setCounterPrice(e.target.value)} className="stripe-input w-full pr-14" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-stripe-body">USDC</span>
                </div>
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body block mb-1">Message</label>
                <textarea value={counterMsg} onChange={e => setCounterMsg(e.target.value)} rows={2} className="stripe-input w-full resize-none" placeholder="gw counter segini, deal?" maxLength={200} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCounterTarget(null)} className="flex-1 py-2 rounded border border-stripe-border text-[13px] text-stripe-body hover:bg-gray-50 transition">Cancel</button>
                <button onClick={() => submitCounter(counterTarget.id)} disabled={!counterPrice || Number(counterPrice) <= 0} className="flex-1 py-2 rounded bg-blue-600 text-white text-[13px] font-medium hover:bg-blue-700 transition disabled:opacity-40">Counter &rarr;</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

export default function OfferModal({ listing, wallet, API_URL, onClose, onSubmitted }) {
  const navigate = useNavigate()
  const [price, setPrice] = useState(listing.price)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const creatorIsSeller = listing.role === 'buyer'
  // Collateral always comes from listing — contract handles both cases:
  // - creatorIsSeller=true: creator locks at createRoom
  // - creatorIsSeller=false: counterparty (seller) locks at joinRoom
  const collateral = listing.collateral || '0'

  const isAccepting = Number(price) === Number(listing.price)

  const handleSubmit = async () => {
    if (!price || submitting) return
    setSubmitting(true)
    try {
      if (isAccepting) {
        // Same price — skip offer, go straight to create room
        const counterparty = listing.creator
        navigate(`/create?item=${encodeURIComponent(listing.title)}&price=${listing.price}&collateral=${collateral}&creatorIsSeller=${creatorIsSeller}&counterparty=${counterparty}&listingId=${listing.id}&deliveryDays=${listing.deliveryDays || 5}`)
        return
      }
      // Different price — create counter offer
      await fetch(`${API_URL}/api/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          listingTitle: listing.title,
          listingRole: listing.role,
          listingCreator: listing.creator,
          offererWallet: wallet.address,
          offerPrice: price,
          collateral: listing.collateral || '0',
          message,
          type: 'counter',
        }),
      })
      onSubmitted()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#1a1d2e] rounded-lg border border-zinc-200 dark:border-white/10 shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-white/10">
          <div className="flex items-center justify-between mb-1">
            <div className="font-mono text-[10px] uppercase tracking-[2px] text-zinc-400">
              {listing.role === 'buyer' ? '◈ SELL TO BUYER' : '◆ BUY FROM SELLER'}
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white text-lg leading-none">×</button>
          </div>
          <h3 className="text-[15px] font-medium text-zinc-900 dark:text-white">{listing.title}</h3>
          <p className="text-[12px] text-zinc-500 dark:text-gray-400 mt-0.5">
            Listed at <span className="font-mono font-semibold text-zinc-800 dark:text-white">{listing.price} USDC</span>
            {Number(listing.collateral) > 0 && <> · Collateral <span className="font-mono text-amber-700 dark:text-amber-400">{listing.collateral}</span></>}
          </p>
        </div>

        <div className="p-5">
          <div className="mb-4">
            <label className="font-mono text-[10px] uppercase tracking-[2px] text-zinc-400 block mb-1.5">
              {listing.role === 'buyer' ? 'Your asking price' : 'Your offer price'}
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="stripe-input w-full pr-14"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400 font-mono">USDC</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 font-mono">
              Listed at {listing.price} USDC
              {Number(price) !== Number(listing.price) && Number(price) > 0 && (
                <> · You offer <span className="font-semibold text-zinc-700 dark:text-white">{price} USDC</span></>
              )}
            </p>
          </div>

          {/* Info box */}
          <div className={`rounded-md p-3 mb-4 text-[12px] ${isAccepting ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'}`}>
            {isAccepting
              ? '✓ Same price — creates room directly. No offer needed.'
              : '↳ Different price — sends counter offer. Seller can accept, counter, or decline.'
            }
          </div>

          <div className="mb-5">
            <label className="font-mono text-[10px] uppercase tracking-[2px] text-zinc-400 block mb-1.5">Message (optional)</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={2}
              className="stripe-input w-full resize-none"
              placeholder="gw nawar dikit ya"
              maxLength={300}
            />
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded border border-zinc-200 dark:border-white/10 text-[13px] text-zinc-600 dark:text-gray-400 hover:bg-zinc-50 dark:hover:bg-white/5 transition">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={!price || submitting} className={`flex-1 py-2.5 rounded text-[13px] font-medium transition disabled:opacity-40 ${isAccepting ? 'bg-zinc-900 dark:bg-white text-white dark:text-[#0c0f1a] hover:bg-zinc-800 dark:hover:bg-gray-200' : 'bg-zinc-900 dark:bg-white text-white dark:text-[#0c0f1a] hover:bg-zinc-800 dark:hover:bg-gray-200'}`}>
              {submitting ? 'Sending…' : isAccepting ? `Accept at ${listing.price} USDC →` : `Send Counter Offer →`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

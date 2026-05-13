import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import OfferModal from './OfferModal'
import OffersPanel from './OffersPanel'
import ReputationBadge from './ReputationBadge'

const API_URL = import.meta.env.VITE_API_URL || 'https://arc-escrow-agent-production.up.railway.app'

const CATEGORIES = ['All', 'NFT', 'Wallet', 'Account', 'Service', 'Other']

const CATEGORY_BADGE = {
  NFT: 'bg-zinc-900 text-zinc-300 border-zinc-700',
  Wallet: 'bg-zinc-900 text-zinc-300 border-zinc-700',
  Account: 'bg-zinc-900 text-zinc-300 border-zinc-700',
  Service: 'bg-zinc-900 text-zinc-300 border-zinc-700',
  Other: 'bg-zinc-900 text-zinc-300 border-zinc-700',
}

const CATEGORY_ICON = {
  NFT: '◆',
  Wallet: '◈',
  Account: '◉',
  Service: '▣',
  Other: '▪',
}

const SOCIAL_TYPES = [
  { key: 'twitter', label: 'Twitter / X', icon: '𝕏', placeholder: '@username' },
  { key: 'telegram', label: 'Telegram', icon: '✈️', placeholder: '@username' },
  { key: 'discord', label: 'Discord', icon: '🎮', placeholder: 'username#1234' },
]

function formatAddress(addr) {
  if (!addr) return '—'
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function socialLink(type, value) {
  const clean = value.replace(/^@/, '')
  if (type === 'twitter') return `https://x.com/${clean}`
  if (type === 'telegram') return `https://t.me/${clean}`
  return null
}

export default function Market({ wallet }) {
  const navigate = useNavigate()
  const [listings, setListings] = useState([])
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [offerTarget, setOfferTarget] = useState(null) // listing being offered on
  const [showOffers, setShowOffers] = useState(false)
  const [form, setForm] = useState({
    role: 'seller', title: '', description: '', category: 'NFT', price: '', collateral: '', deliveryDays: 5,
    socials: { twitter: '', telegram: '', discord: '' },
  })

  async function fetchListings() {
    try {
      const cat = filter === 'All' ? '' : `?category=${filter}`
      const res = await fetch(`${API_URL}/api/listings${cat}`)
      const data = await res.json()
      setListings(data)
    } catch (err) {
      console.error('Failed to fetch listings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchListings() }, [filter])

  // Auto-poll every 15s
  useEffect(() => {
    const interval = setInterval(() => fetchListings(), 15000)
    return () => clearInterval(interval)
  }, [filter])

  const [formError, setFormError] = useState('')
  const [touched, setTouched] = useState({ title: false, price: false })

  const handleSubmit = async () => {
    setFormError('')
    if (!wallet) { setFormError('Connect your wallet first'); return }
    if (!form.title.trim()) { setTouched(t => ({ ...t, title: true })); setFormError('Title is required'); return }
    if (!form.price || Number(form.price) <= 0) { setTouched(t => ({ ...t, price: true })); setFormError('Price must be greater than 0'); return }
    const socials = {}
    for (const s of SOCIAL_TYPES) {
      if (form.socials[s.key]?.trim()) socials[s.key] = form.socials[s.key].trim()
    }
    try {
      const res = await fetch(`${API_URL}/api/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: form.role,
          title: form.title.trim(),
          description: form.description,
          category: form.category,
          price: form.price,
          collateral: form.collateral || '0',
          deliveryDays: Number(form.deliveryDays) || 5,
          creator: wallet.address,
          socials: Object.keys(socials).length > 0 ? socials : undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to post')
      setForm({ role: 'seller', title: '', description: '', category: 'NFT', price: '', collateral: '', deliveryDays: 5, socials: { twitter: '', telegram: '', discord: '' } })
      setTouched({ title: false, price: false })
      setShowForm(false)
      fetchListings()
    } catch (err) {
      console.error(err)
      setFormError(err.message || 'Failed to post listing')
    }
  }

  const handleOpenDeal = (listing) => {
    setOfferTarget(listing)
  }

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_URL}/api/listings/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creator: wallet?.address }),
      })
      fetchListings()
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = filter === 'All' ? listings : listings.filter(l => l.category === filter)
  const searched = search.trim()
    ? filtered.filter(l =>
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.description?.toLowerCase().includes(search.toLowerCase())
      )
    : filtered

  return (
    <section className="pt-24 pb-32 px-4 sm:px-6 min-h-screen">
      <div className="max-w-[700px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[3px] text-stripe-body dark:text-gray-500 mb-2">Market</div>
            <h1 className="text-[28px] font-light text-stripe-navy dark:text-white" style={{ letterSpacing: '-0.56px' }}>
              Browse deals.
            </h1>
            <p className="text-[14px] text-stripe-body dark:text-gray-400 mt-1">
              Post what you're selling or find deals. Each listing opens a trustless escrow.
            </p>
          </div>
          {wallet && (
            <>
              <button onClick={() => { setShowOffers(!showOffers); setShowForm(false) }} className={`text-[13px] shrink-0 mr-2 px-4 py-2 rounded border transition ${showOffers ? 'bg-zinc-900 text-zinc-100 border-zinc-700' : 'border-zinc-300 text-zinc-600 hover:border-zinc-500'}`}>
                Offers
              </button>
              <button onClick={() => { setShowForm(!showForm); setShowOffers(false) }} className="btn-primary text-[13px] shrink-0">
                {showForm ? 'Cancel' : '+ Post Listing'}
              </button>
            </>
          )}
        </div>

        {/* Create form */}
        {showForm && (
          <div className="card-3d p-6 mb-8">
            <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-500 mb-4">New Listing</div>

            {/* Role toggle */}
            <div className="mb-4">
              <label className="font-mono text-[10px] uppercase tracking-[2px] text-zinc-400 block mb-2">// i am</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'seller' })}
                  className={`flex-1 py-2.5 rounded text-[13px] font-mono border transition ${
                    form.role === 'seller'
                      ? 'bg-zinc-900 text-zinc-100 border-zinc-700'
                      : 'bg-white dark:bg-white/5 text-zinc-500 dark:text-gray-400 border-zinc-200 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/20'
                  }`}
                >
                  ◆ SELLER — I have something to sell
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'buyer' })}
                  className={`flex-1 py-2.5 rounded text-[13px] font-mono border transition ${
                    form.role === 'buyer'
                      ? 'bg-zinc-900 text-zinc-100 border-zinc-700'
                      : 'bg-white dark:bg-white/5 text-zinc-500 dark:text-gray-400 border-zinc-200 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/20'
                  }`}
                >
                  ◈ BUYER — I want to buy something
                </button>
              </div>
            </div>

            <input
              className={`stripe-input mb-3 ${touched.title && !form.title.trim() ? 'border-red-300 dark:border-red-500/50 bg-red-50/30' : ''}`}
              placeholder="Title (e.g. Azuki NFT Whitelist Spot) *"
              value={form.title}
              onChange={(e) => { setForm({ ...form, title: e.target.value }); setTouched(t => ({ ...t, title: true })) }}
              onBlur={() => setTouched(t => ({ ...t, title: true }))}
              maxLength={100}
            />
            <textarea className="stripe-input mb-3 resize-none" placeholder="Description — what are you selling?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} maxLength={500} />

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-500 block mb-1.5">Category</label>
                <select className="stripe-input w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-500 block mb-1.5">Price *</label>
                <div className="relative">
                  <input
                    className={`stripe-input w-full ${touched.price && (!form.price || Number(form.price) <= 0) ? 'border-red-300 dark:border-red-500/50 bg-red-50/30' : ''}`}
                    type="number"
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => { setForm({ ...form, price: e.target.value }); setTouched(t => ({ ...t, price: true })) }}
                    onBlur={() => setTouched(t => ({ ...t, price: true }))}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-stripe-body dark:text-gray-500">USDC</span>
                </div>
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-500 block mb-1.5">Delivery</label>
                <div className="relative">
                  <input className="stripe-input w-full" type="number" min={1} max={90} step={1} value={form.deliveryDays} onChange={(e) => setForm({ ...form, deliveryDays: Math.max(1, Math.min(90, Number(e.target.value) || 1)) })} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-stripe-body dark:text-gray-500">days</span>
                </div>
              </div>
            </div>

            {/* Collateral */}
            <div className="mb-4">
              <label className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-500 block mb-1.5">Collateral {form.role === 'buyer' ? '(N/A)' : ''}</label>
              {form.role === 'seller' ? (
                <div className="relative">
                  <input className="stripe-input w-full" type="number" placeholder="0 (optional)" min="0" step="0.01" value={form.collateral} onChange={(e) => setForm({ ...form, collateral: e.target.value })} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-stripe-body dark:text-gray-500">USDC</span>
                </div>
              ) : (
                <div className="stripe-input w-full text-[13px] text-stripe-body dark:text-gray-500 bg-stripe-surface dark:bg-white/5">Buyers don't pay collateral</div>
              )}
            </div>

            {/* Social contacts */}
            <div className="mb-4">
              <label className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-500 block mb-2">Contact (optional)</label>
              <div className="grid grid-cols-3 gap-3">
                {SOCIAL_TYPES.map((s) => (
                  <div key={s.key}>
                    <input className="stripe-input w-full" placeholder={`${s.icon} ${s.placeholder}`} value={form.socials[s.key] || ''} onChange={(e) => setForm({ ...form, socials: { ...form.socials, [s.key]: e.target.value } })} />
                    <div className="text-[10px] text-stripe-body mt-1 text-center">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleSubmit} className="btn-primary w-full py-3">Post Listing</button>
            {formError && (
              <div className="mt-3 px-4 py-2.5 rounded text-[13px] font-medium border bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20">
                {formError}
              </div>
            )}
          </div>
        )}

        {/* Search + Category filter */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <input
              className="stripe-input w-full pl-9"
              placeholder="Search listings…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-stripe-body dark:text-gray-500" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
              <path d="M16 16l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stripe-body dark:text-gray-500 hover:text-stripe-navy dark:hover:text-white text-[12px]">
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-3 mb-6 -mx-1 px-1">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setFilter(cat)} className={`text-[11px] font-mono px-3 py-1.5 rounded whitespace-nowrap border transition ${filter === cat ? 'bg-zinc-900 text-zinc-100 border-zinc-700' : 'text-zinc-500 dark:text-gray-400 border-zinc-200 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/20 hover:text-zinc-700 dark:hover:text-white bg-white dark:bg-white/5'}`}>
              {cat !== 'All' && <span className="mr-1 opacity-60">{CATEGORY_ICON[cat]}</span>}{cat}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="card-3d p-8 text-center">
            <div className="text-stripe-body dark:text-gray-400 text-[14px]">Loading listings…</div>
          </div>
        )}

        {/* Listings */}
        {!loading && searched.length === 0 && (
          <div className="card-3d p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-lg border border-stripe-border dark:border-white/10 flex items-center justify-center text-2xl">🔍</div>
            <h3 className="text-[16px] font-medium text-stripe-navy dark:text-white mb-2">
              {search ? 'No results found' : 'No listings yet'}
            </h3>
            <p className="text-[14px] text-stripe-body dark:text-gray-400">
              {search ? `No listings match "${search}"` : wallet ? 'Post the first listing!' : 'Connect your wallet to post a listing.'}
            </p>
          </div>
        )}

        {!loading && searched.length > 0 && (
          <div className="flex flex-col gap-3">
            {searched.map((listing) => (
              <ListingCard key={listing.id} listing={listing} wallet={wallet} expanded={expandedId === listing.id} onToggle={() => setExpandedId(expandedId === listing.id ? null : listing.id)} onOpenDeal={() => handleOpenDeal(listing)} onDelete={() => handleDelete(listing.id)} />
            ))}
          </div>
        )}

        {/* Offers panel */}
        {showOffers && wallet && (
          <OffersPanel wallet={wallet} API_URL={API_URL} />
        )}

        {/* Offer modal */}
        {offerTarget && wallet && (
          <OfferModal
            listing={offerTarget}
            wallet={wallet}
            API_URL={API_URL}
            onClose={() => setOfferTarget(null)}
            onSubmitted={() => { setOfferTarget(null); fetchListings() }}
          />
        )}
      </div>
    </section>
  )
}

function ListingCard({ listing, wallet, expanded, onToggle, onOpenDeal, onDelete }) {
  const isOwner = wallet && listing.creator?.toLowerCase() === wallet.address?.toLowerCase()
  const hasSocials = listing.socials && Object.keys(listing.socials).length > 0

  return (
    <div className="card-3d overflow-hidden">
      <div className="p-5 cursor-pointer hover:bg-stripe-surface/50 dark:hover:bg-white/5 transition" onClick={onToggle}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider border ${
                listing.role === 'buyer'
                  ? 'bg-blue-950 text-blue-300 border-blue-800'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-700'
              }`}>
                {listing.role === 'buyer' ? '◈ BUYER' : '◆ SELLER'}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider border ${CATEGORY_BADGE[listing.category] || CATEGORY_BADGE.Other}`}>
                {CATEGORY_ICON[listing.category] || '▪'} {listing.category?.toUpperCase()}
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">{timeAgo(listing.createdAt)}</span>
              {hasSocials && <span className="text-[10px] text-zinc-400">• chat</span>}
              {listing.taken && <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">⏳ In Progress</span>}
            </div>
            <h3 className="text-[14px] font-medium text-zinc-900 mb-1 font-mono">{listing.title}</h3>
            <div className="flex items-center gap-3 text-[12px] text-zinc-500 font-mono">
              <span className="text-zinc-800 font-medium">{listing.price} USDC</span>
              {Number(listing.collateral) > 0 && <span className="text-amber-600">🔒 {listing.collateral}</span>}
              <span className="text-zinc-400">{formatAddress(listing.creator)}</span>
              <ReputationBadge provider={wallet?.provider} address={listing.creator} />
            </div>
          </div>
          <div className="text-[12px] text-zinc-400 shrink-0 mt-1 font-mono">{expanded ? '↑' : '↓'}</div>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-zinc-200 dark:border-white/10 pt-4">
          <div className="mb-4">
            <div className="font-mono text-[10px] uppercase tracking-[2px] text-zinc-400 mb-1.5">// description</div>
            <p className="text-[13px] text-zinc-700 leading-[1.6]">{listing.description || 'No description.'}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-zinc-50 border border-zinc-200 rounded p-3">
              <div className="font-mono text-[9px] uppercase tracking-[2px] text-zinc-400 mb-1">price</div>
              <div className="text-[15px] font-semibold text-zinc-900 dark:text-white font-mono">{listing.price} <span className="text-[11px] text-zinc-500">USDC</span></div>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 rounded p-3">
              <div className="font-mono text-[9px] uppercase tracking-[2px] text-zinc-400 mb-1">collateral</div>
              <div className="text-[15px] font-semibold text-amber-700 dark:text-amber-400 font-mono">{Number(listing.collateral) > 0 ? `${listing.collateral} USDC` : 'none'}</div>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 rounded p-3">
              <div className="font-mono text-[9px] uppercase tracking-[2px] text-zinc-400 mb-1">delivery</div>
              <div className="text-[15px] font-semibold text-zinc-900 dark:text-white font-mono">{listing.deliveryDays || 5} <span className="text-[11px] text-zinc-500">days</span></div>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 rounded p-3">
              <div className="font-mono text-[9px] uppercase tracking-[2px] text-zinc-400 mb-1">seller</div>
              <div className="text-[13px] font-semibold text-zinc-500 dark:text-gray-400 font-mono mb-2">{formatAddress(listing.creator)}</div>
              <ReputationBadge provider={wallet?.provider} address={listing.creator} showDetails />
            </div>
          </div>

          {hasSocials && (
            <div className="mb-4">
              <div className="font-mono text-[10px] uppercase tracking-[2px] text-zinc-400 mb-2">// contact seller</div>
              <div className="flex flex-wrap gap-2">
                {SOCIAL_TYPES.map((s) => {
                  const value = listing.socials?.[s.key]
                  if (!value) return null
                  const link = socialLink(s.key, value)
                  return link ? (
                    <a key={s.key} href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-200 dark:border-white/10 text-[12px] text-zinc-700 dark:text-gray-300 hover:bg-zinc-100 dark:hover:bg-white/5 hover:border-zinc-400 dark:hover:border-white/20 transition no-underline">
                      <span>{s.icon}</span><span className="font-mono">{value}</span>
                    </a>
                  ) : (
                    <span key={s.key} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-200 dark:border-white/10 text-[12px] text-zinc-700 dark:text-gray-300">
                      <span>{s.icon}</span><span className="font-mono">{value}</span>
                    </span>
                  )
                })}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1.5 font-mono">chat before committing.</p>
            </div>
          )}

          <div className="flex gap-2">
            {isOwner ? (
              <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-[12px] px-4 py-2 rounded border border-red-200 dark:border-red-500/20 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition">Delete Listing</button>
            ) : listing.taken ? (
              <span className="text-[12px] text-amber-600 dark:text-amber-400 font-medium px-5 py-2.5">⏳ Room in progress</span>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); onOpenDeal() }} className="btn-primary text-[13px] px-5 py-2.5">
                {listing.role === 'buyer' ? 'Sell to them →' : 'Open Deal →'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

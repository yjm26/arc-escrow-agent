import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import OfferModal from './OfferModal'
import OffersPanel from './OffersPanel'
import ReputationBadge from './ReputationBadge'

const API_URL = import.meta.env.VITE_API_URL || 'https://arc-escrow-agent-production.up.railway.app'

const CATEGORIES = ['All', 'NFT', 'Wallet', 'Account', 'Service', 'Other']

const CATEGORY_ICON = {
  NFT: '◆',
  Wallet: '◈',
  Account: '◉',
  Service: '▣',
  Other: '▪',
}

const CATEGORY_STYLES = {
  NFT:    { bg: 'rgba(139,92,246,0.07)', color: '#8b5cf6', border: 'rgba(139,92,246,0.15)' },
  Wallet: { bg: 'rgba(6,182,212,0.07)',  color: '#06b6d4', border: 'rgba(6,182,212,0.15)' },
  Account:{ bg: 'rgba(245,158,11,0.07)', color: '#d97706', border: 'rgba(245,158,11,0.15)' },
  Service:{ bg: 'rgba(16,185,129,0.07)', color: '#059669', border: 'rgba(16,185,129,0.15)' },
  Other:  { bg: 'rgba(156,163,175,0.07)', color: '#6b7280', border: 'rgba(156,163,175,0.15)' },
}

const SOCIAL_TYPES = [
  { key: 'twitter', label: 'Twitter / X', icon: '𝕏', placeholder: '@username' },
  { key: 'telegram', label: 'Telegram', icon: '✈️', placeholder: '@username' },
  { key: 'discord', label: 'Discord', icon: '🎮', placeholder: 'username#1234' },
]

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest first' },
  { key: 'price_asc', label: 'Price: Low → High' },
  { key: 'price_desc', label: 'Price: High → Low' },
  { key: 'delivery', label: 'Delivery: Fastest' },
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
  const [sort, setSort] = useState('newest')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [offerTarget, setOfferTarget] = useState(null)
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

  const sorted = useMemo(() => {
    let data = listings.slice()
    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q)
      )
    }
    switch (sort) {
      case 'price_asc':
        data.sort((a, b) => Number(a.price) - Number(b.price))
        break
      case 'price_desc':
        data.sort((a, b) => Number(b.price) - Number(a.price))
        break
      case 'delivery':
        data.sort((a, b) => (a.deliveryDays || 5) - (b.deliveryDays || 5))
        break
      case 'newest':
      default:
        data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        break
    }
    return data
  }, [listings, search, sort])

  return (
    <section className="pt-24 pb-32 px-4 sm:px-6 min-h-screen">
      <div className="max-w-[900px] mx-auto">

        {/* Header */}
        <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[3px] text-stripe-body dark:text-gray-500 mb-2">Market</div>
            <h1 className="text-[28px] font-light text-stripe-navy dark:text-white" style={{ letterSpacing: '-0.56px' }}>
              Browse deals.
            </h1>
            <p className="text-[14px] text-stripe-body dark:text-gray-400 mt-1">
              Pick a listing and open a trustless escrow room.
            </p>
          </div>
          {wallet && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => { setShowOffers(!showOffers); setShowForm(false) }}
                className={`text-[13px] px-4 py-2 rounded-md border transition ${showOffers ? 'bg-zinc-900 text-zinc-100 border-zinc-700' : 'border-zinc-300 text-zinc-600 hover:border-zinc-500'}`}
              >
                Offers
              </button>
              <button
                onClick={() => { setShowForm(!showForm); setShowOffers(false) }}
                className="btn-primary text-[13px] shrink-0"
              >
                {showForm ? 'Cancel' : '+ Post Listing'}
              </button>
            </div>
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

        {/* Search + Sort + Category filter */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex-1 min-w-[180px] max-w-[320px] relative">
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
          <select
            className="stripe-input text-[13px] py-2 pr-8"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2364748D' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-3 mb-6 -mx-1 px-1">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setFilter(cat)} className={`text-[11px] font-mono px-3 py-1.5 rounded-md whitespace-nowrap border transition ${filter === cat ? 'bg-zinc-900 text-zinc-100 border-zinc-700' : 'text-zinc-500 dark:text-gray-400 border-zinc-200 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/20 hover:text-zinc-700 dark:hover:text-white bg-white dark:bg-white/5'}`}>
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
        {!loading && sorted.length === 0 && (
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

        {!loading && sorted.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sorted.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                wallet={wallet}
                onOpenDeal={() => handleOpenDeal(listing)}
                onDelete={() => handleDelete(listing.id)}
              />
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

function ListingCard({ listing, wallet, onOpenDeal, onDelete }) {
  const isOwner = wallet && listing.creator?.toLowerCase() === wallet.address?.toLowerCase()
  const hasSocials = listing.socials && Object.keys(listing.socials).length > 0
  const catStyle = CATEGORY_STYLES[listing.category] || CATEGORY_STYLES.Other
  const isBuyerListing = listing.role === 'buyer'

  return (
    <div className="listing-card relative rounded-[10px] border border-stripe-border dark:border-white/10 overflow-hidden transition-all duration-200 hover:shadow-stripe-md"
      data-role={listing.role}
      style={{
        background: isBuyerListing
          ? 'linear-gradient(to right, rgba(37,99,235,0.03), var(--tw-bg-opacity,1) 40px)'
          : 'linear-gradient(to right, rgba(107,114,128,0.03), var(--tw-bg-opacity,1) 40px)',
      }}
    >
      {/* Role accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: isBuyerListing ? '#2563eb' : '#9ca3af' }}
      />

      <div className="p-4 pl-5 flex flex-col">
        {/* Meta row: category + time + status */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[10px] font-semibold tracking-wide uppercase"
            style={{ background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }}
          >
            {CATEGORY_ICON[listing.category] || '▪'} {listing.category?.toUpperCase()}
          </span>
          <span className="text-[11px] text-zinc-400 dark:text-gray-500 font-mono">{timeAgo(listing.createdAt)}</span>
          {listing.taken ? (
            <span className="ml-auto text-[10px] font-medium px-2 py-[2px] rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20">⏳ In Progress</span>
          ) : (
            <span className="ml-auto text-[10px] font-medium px-2 py-[2px] rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">Active</span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white leading-snug mb-3 tracking-tight line-clamp-2">
          {listing.title}
        </h3>

        {/* Price row */}
        <div className="flex items-baseline gap-2 mb-3 pb-3 border-b border-stripe-border/60 dark:border-white/5">
          <span className="text-[26px] font-semibold text-zinc-900 dark:text-white tracking-tight leading-none font-mono">
            {listing.price}
          </span>
          <span className="text-[13px] text-zinc-400 dark:text-gray-500 font-normal">USDC</span>
          {Number(listing.collateral) > 0 ? (
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-[3px] rounded-full border border-amber-100 dark:border-amber-500/20 font-mono">
              🔒 {listing.collateral}
            </span>
          ) : (
            <span className="ml-auto text-[11px] text-zinc-400 dark:text-gray-500">No collateral</span>
          )}
        </div>

        {/* Seller row */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-[22px] h-[22px] rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 shrink-0">
            0x
          </div>
          <span className="text-[12px] text-zinc-400 dark:text-gray-500 font-mono">{formatAddress(listing.creator)}</span>
          <span className="ml-auto">
            <ReputationBadge provider={wallet?.provider} address={listing.creator} />
          </span>
        </div>

        {/* Delivery + chat row */}
        <div className="flex items-center gap-1.5 text-[12px] text-zinc-400 dark:text-gray-500 mt-1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>Delivery in {listing.deliveryDays || 5} days</span>
          {hasSocials && (
            <span className="ml-auto flex items-center gap-1">
              <span className="w-[6px] h-[6px] rounded-full bg-emerald-500"></span>
              DM ready
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pl-5 pb-4 pt-0">
        {isOwner ? (
          listing.taken ? (
            <span className="text-[12px] text-amber-600 dark:text-amber-400 font-medium px-1">⏳ Room Active</span>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-[12px] px-4 py-2 rounded-md border border-red-200 dark:border-red-500/20 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition">
              Delete Listing
            </button>
          )
        ) : listing.taken ? (
          <span className="text-[12px] text-amber-600 dark:text-amber-400 font-medium px-1">⏳ Room in progress</span>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); onOpenDeal() }} className="btn-primary text-[13px] px-5 py-2.5 w-full">
            {listing.role === 'buyer' ? 'Sell to Them →' : 'Open Deal →'}
          </button>
        )}
      </div>
    </div>
  )
}

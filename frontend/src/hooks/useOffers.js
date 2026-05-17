import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '../lib/api'

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function fmt(addr) {
  if (!addr) return '\u2014'
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`
}

const STATUS_STYLE = {
  pending:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  accepted: 'bg-green-50 text-green-700 border-green-200',
  declined: 'bg-red-50 text-red-700 border-red-200',
  countered:'bg-blue-50 text-blue-700 border-blue-200',
}

export function useOffers(wallet, API_URL, navigate, opts = {}) {
  const defaultTab = opts.defaultTab || 'incoming'
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState(defaultTab)
  const [counterTarget, setCounterTarget] = useState(null)
  const [counterPrice, setCounterPrice] = useState('')
  const [counterMsg, setCounterMsg] = useState('')

  const fetchOffers = useCallback(async () => {
    if (!wallet?.address) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/offers?wallet=${wallet.address}`)
      const data = await res.json()
      setOffers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch offers:', err)
    } finally {
      setLoading(false)
    }
  }, [wallet?.address, API_URL])

  useEffect(() => { fetchOffers() }, [fetchOffers])

  useEffect(() => {
    if (!wallet?.address) return
    const i = setInterval(fetchOffers, 10000)
    return () => clearInterval(i)
  }, [wallet?.address, fetchOffers])

  const incoming = offers.filter(o => o.listingCreator.toLowerCase() === wallet?.address?.toLowerCase())
  const outgoing = offers.filter(o => o.offererWallet.toLowerCase() === wallet?.address?.toLowerCase())
  const displayed = tab === 'incoming' ? incoming : outgoing

  async function accept(offerId) {
    try {
      await authFetch(`/api/offers/${offerId}/accept`, { method: 'PUT' }, wallet)
      await fetchOffers()
    } catch (err) { console.error(err) }
  }

  async function decline(offerId) {
    try {
      await authFetch(`/api/offers/${offerId}/decline`, { method: 'PUT' }, wallet)
      await fetchOffers()
    } catch (err) { console.error(err) }
  }

  async function submitCounter(offerId) {
    try {
      await authFetch(`/api/offers/${offerId}/counter`, {
        method: 'PUT',
        body: JSON.stringify({ counterPrice, counterMessage: counterMsg }),
      }, wallet)
      setCounterTarget(null)
      setCounterPrice('')
      setCounterMsg('')
      await fetchOffers()
    } catch (err) { console.error(err) }
  }

  function openRoom(offer, isOutgoing) {
    const iAmSeller = isOutgoing
      ? offer.listingRole === 'buyer'
      : offer.listingRole === 'seller'
    const collateral = iAmSeller ? (offer.collateral || '0') : '0'
    const counterparty = isOutgoing ? offer.listingCreator : offer.offererWallet
    navigate(`/create?item=${encodeURIComponent(offer.listingTitle)}&price=${offer.offerPrice || offer.counterPrice}&collateral=${collateral}&creatorIsSeller=${iAmSeller}&counterparty=${counterparty}&listingId=${offer.listingId || offer.listing_id || ''}&deliveryDays=${offer.deliveryDays || 5}`)
  }

  const startCounter = (offer, price) => {
    setCounterTarget(offer)
    setCounterPrice(price)
    setCounterMsg('')
  }

  return {
    offers, loading, tab, setTab,
    incoming, outgoing, displayed,
    counterTarget, setCounterTarget,
    counterPrice, setCounterPrice,
    counterMsg, setCounterMsg,
    fetchOffers, accept, decline, submitCounter, openRoom, startCounter,
    timeAgo, fmt, STATUS_STYLE,
  }
}

const http = require('http')
const fs = require('fs')
const path = require('path')
const { ethers } = require('ethers')

const PORT = process.env.PORT || 3001
const DATA_FILE = path.join(__dirname, 'listings.json')
const NOTIF_FILE = path.join(__dirname, 'notifications.json')
const OFFERS_FILE = path.join(__dirname, 'offers.json')
const ROOM_CODES_FILE = path.join(__dirname, 'room_codes.json')

// ═══════════════════════════════════════
//  Auth: nonce-based wallet verification
// ═══════════════════════════════════════

const nonces = new Map() // address -> { nonce, expires }
const NONCE_TTL = 5 * 60 * 1000 // 5 minutes

function getNonce(address) {
  const a = address.toLowerCase()
  const existing = nonces.get(a)
  if (existing && existing.expires > Date.now()) return existing
  const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36)
  const entry = { nonce, expires: Date.now() + NONCE_TTL }
  nonces.set(a, entry)
  return entry
}

/**
 * Verify wallet ownership via signed SIWE-like message.
 * Returns the verified address on success, null on failure.
 */
async function verifySignature({ address, signature, nonce }) {
  try {
    const msg = `bond.arc.network wants you to sign in with your Ethereum account:\n${address}\n\nNonce: ${nonce}`
    const verified = ethers.verifyMessage(msg, signature)
    return verified.toLowerCase() === address.toLowerCase() ? address.toLowerCase() : null
  } catch {
    return null
  }
}

// ═══════════════════════════════════════
//  Input sanitization (XSS prevention)
// ═══════════════════════════════════════

function sanitize(str, maxLen = 500) {
  if (typeof str !== 'string') return ''
  return str
    .slice(0, maxLen)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
}

// ═══════════════════════════════════════
//  CORS
// ═══════════════════════════════════════

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://bond.yjm26.xyz',
]

function corsHeaders(origin) {
  const o = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  }
}

// ═══════════════════════════════════════
//  Storage helpers
// ═══════════════════════════════════════

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) }
  catch { return fallback }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

function getDefaultListings() {
  const seeds = [
    { id: 1, role: 'seller', title: 'Azuki NFT Whitelist Spot', description: 'Guaranteed WL for Azuki Elementals mint. Wallet surrender after purchase. Serious buyers only — DM me on Twitter first to confirm availability.', category: 'NFT', price: '0.5', collateral: '0.25', creator: '0xAa11000000000000000000000000000000000000', createdAt: Date.now() - 3600000, socials: { twitter: '@azuki_seller', telegram: '@azuki_deals' } },
    { id: 2, role: 'seller', title: 'MetaMask Wallet (fresh)', description: 'Brand new MetaMask wallet with no history. Full seed phrase transfer. Created specifically for multi-account farming. No KYC attached.', category: 'Wallet', price: '2.0', collateral: '1.0', creator: '0xBb22000000000000000000000000000000000000', createdAt: Date.now() - 7200000, socials: { discord: 'walletguy#9999' } },
    { id: 3, role: 'buyer', title: 'LF: Twitter Account 10K+', description: 'Looking for crypto-focused Twitter account with 10K+ organic followers. No bans. Budget flexible for the right account.', category: 'Account', price: '1.5', collateral: '0', creator: '0xCc33000000000000000000000000000000000000', createdAt: Date.now() - 10800000, socials: { telegram: '@buyer_main' } },
    { id: 4, role: 'seller', title: 'Smart Contract Audit', description: 'One Solidity contract audit, 48h turnaround, detailed PDF report with severity ratings. Experience with DeFi, NFT, and token contracts.', category: 'Service', price: '0.8', collateral: '0', creator: '0xDd44000000000000000000000000000000000000', createdAt: Date.now() - 14400000, socials: { discord: 'auditor#0001', twitter: '@audit_service' } },
    { id: 5, role: 'seller', title: 'Pudgy Penguins WL — 2 spots', description: 'Two whitelist spots for upcoming Pudgy Penguins mint. Price is per spot. Can buy 1 or 2. Verified by project team.', category: 'NFT', price: '0.3', collateral: '0.15', creator: '0xEe55000000000000000000000000000000000000', createdAt: Date.now() - 18000000, socials: { telegram: '@pudgy_wl' } },
  ]
  writeJSON(DATA_FILE, seeds)
  return seeds
}

// ═══════════════════════════════════════
//  HTTP helpers
// ═══════════════════════════════════════

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try { resolve(JSON.parse(body)) } catch { reject(new Error('Invalid JSON')) }
    })
  })
}

function json(res, data, status = 200, origin = '*') {
  res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders(origin) })
  res.end(JSON.stringify(data))
}

function parseAuth(req) {
  return {
    wallet: req.headers['x-wallet-address'] || '',
    signature: req.headers['x-signature'] || '',
    nonce: req.headers['x-nonce'] || '',
  }
}

// ═══════════════════════════════════════
//  Server
// ═══════════════════════════════════════

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '*'

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(origin))
    return res.end()
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)
  const pathname = url.pathname

  try {
    // ── AUTH ──

    // GET /api/auth/nonce?address=0x...
    if (pathname === '/api/auth/nonce' && req.method === 'GET') {
      const address = url.searchParams.get('address')
      if (!address || !ethers.isAddress(address)) return json(res, { error: 'Valid address required' }, 400, origin)
      const entry = getNonce(address)
      return json(res, { nonce: entry.nonce }, 200, origin)
    }

    // POST /api/auth/verify
    if (pathname === '/api/auth/verify' && req.method === 'POST') {
      const body = await parseBody(req)
      if (!body.address || !body.signature || !body.nonce) return json(res, { error: 'address, signature, nonce required' }, 400, origin)
      const verified = await verifySignature(body)
      if (!verified) return json(res, { error: 'Signature verification failed' }, 401, origin)
      return json(res, { ok: true, address: verified }, 200, origin)
    }

    // ── LISTINGS ──

    // GET /api/listings
    if (pathname === '/api/listings' && req.method === 'GET') {
      const category = url.searchParams.get('category')
      const role = url.searchParams.get('role')
      const q = url.searchParams.get('q')?.toLowerCase()
      let listings = readJSON(DATA_FILE, [])
      if (category && category !== 'All') listings = listings.filter(l => l.category === category)
      if (role && role !== 'all') listings = listings.filter(l => l.role === role)
      if (q) listings = listings.filter(l =>
        l.title.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q)
      )
      return json(res, listings, 200, origin)
    }

    // POST /api/listings — requires auth
    if (pathname === '/api/listings' && req.method === 'POST') {
      const auth = parseAuth(req)
      if (!auth.wallet || !auth.signature || !auth.nonce) return json(res, { error: 'Wallet authentication required' }, 401, origin)
      const verified = await verifySignature(auth)
      if (!verified) return json(res, { error: 'Invalid signature' }, 401, origin)

      const body = await parseBody(req)
      if (!body.title || !body.price) return json(res, { error: 'title, price required' }, 400, origin)

      const listings = readJSON(DATA_FILE, [])
      const newListing = {
        id: Date.now(),
        role: body.role || 'seller',
        title: sanitize(body.title, 200),
        description: sanitize(body.description || '', 2000),
        category: sanitize(body.category || 'Other', 50),
        price: body.price,
        collateral: body.collateral || '0',
        creator: verified, // ← use verified address, not client input
        socials: body.socials ? {
          twitter: sanitize(body.socials.twitter || '', 100) || undefined,
          telegram: sanitize(body.socials.telegram || '', 100) || undefined,
          discord: sanitize(body.socials.discord || '', 100) || undefined,
        } : undefined,
        createdAt: Date.now(),
      }
      listings.unshift(newListing)
      writeJSON(DATA_FILE, listings)
      return json(res, newListing, 201, origin)
    }

    // DELETE /api/listings/:id — requires auth, only creator can delete
    if (pathname.startsWith('/api/listings/') && req.method === 'DELETE') {
      const auth = parseAuth(req)
      if (!auth.wallet || !auth.signature || !auth.nonce) return json(res, { error: 'Wallet authentication required' }, 401, origin)
      const verified = await verifySignature(auth)
      if (!verified) return json(res, { error: 'Invalid signature' }, 401, origin)

      const id = parseInt(pathname.split('/')[3])
      const listings = readJSON(DATA_FILE, [])
      const idx = listings.findIndex(l => l.id === id)
      if (idx === -1) return json(res, { error: 'Not found' }, 404, origin)
      if (listings[idx].creator.toLowerCase() !== verified) {
        return json(res, { error: 'Not your listing' }, 403, origin)
      }
      listings.splice(idx, 1)
      writeJSON(DATA_FILE, listings)
      return json(res, { ok: true }, 200, origin)
    }

    // PUT /api/listings/:id/taken — mark listing as taken
    if (pathname.startsWith('/api/listings/') && pathname.endsWith('/taken') && req.method === 'PUT') {
      const auth = parseAuth(req)
      if (!auth.wallet || !auth.signature || !auth.nonce) return json(res, { error: 'Wallet authentication required' }, 401, origin)
      const verified = await verifySignature(auth)
      if (!verified) return json(res, { error: 'Invalid signature' }, 401, origin)

      const id = parseInt(pathname.split('/')[3])
      const body = await parseBody(req)
      const listings = readJSON(DATA_FILE, [])
      const listing = listings.find(l => l.id === id)
      if (!listing) return json(res, { error: 'Not found' }, 404, origin)
      if (listing.creator.toLowerCase() !== verified) {
        return json(res, { error: 'Not your listing' }, 403, origin)
      }
      listing.taken = true
      listing.takenBy = verified
      listing.takenRoomId = body.roomId || ''
      listing.takenAt = Date.now()
      writeJSON(DATA_FILE, listings)
      return json(res, listing, 200, origin)
    }

    // ── NOTIFICATIONS ──

    // GET /api/notifications/:wallet
    if (pathname.startsWith('/api/notifications/') && req.method === 'GET') {
      const wallet = pathname.split('/')[3]?.toLowerCase()
      if (!wallet) return json(res, { error: 'wallet required' }, 400, origin)
      const notifs = readJSON(NOTIF_FILE, {})
      const userNotifs = notifs[wallet] || []
      return json(res, userNotifs, 200, origin)
    }

    // POST /api/notifications
    if (pathname === '/api/notifications' && req.method === 'POST') {
      const auth = parseAuth(req)
      if (!auth.wallet || !auth.signature || !auth.nonce) return json(res, { error: 'Wallet authentication required' }, 401, origin)
      const verified = await verifySignature(auth)
      if (!verified) return json(res, { error: 'Invalid signature' }, 401, origin)

      const body = await parseBody(req)
      if (!body.to || !body.message) return json(res, { error: 'to, message required' }, 400, origin)
      const notifs = readJSON(NOTIF_FILE, {})
      const to = body.to.toLowerCase()
      if (!notifs[to]) notifs[to] = []
      notifs[to].unshift({
        id: Date.now(),
        message: sanitize(body.message, 500),
        listingId: body.listingId || null,
        from: verified, // verified sender
        read: false,
        createdAt: Date.now(),
      })
      writeJSON(NOTIF_FILE, notifs)
      return json(res, { ok: true }, 201, origin)
    }

    // POST /api/notifications/:wallet/read — mark all as read
    if (pathname.startsWith('/api/notifications/') && pathname.endsWith('/read') && req.method === 'POST') {
      const auth = parseAuth(req)
      if (!auth.wallet || !auth.signature || !auth.nonce) return json(res, { error: 'Wallet authentication required' }, 401, origin)
      const verified = await verifySignature(auth)
      if (!verified) return json(res, { error: 'Invalid signature' }, 401, origin)

      const wallet = pathname.split('/')[3]?.toLowerCase()
      if (!wallet) return json(res, { error: 'wallet required' }, 400, origin)
      if (wallet !== verified) return json(res, { error: 'Not your notifications' }, 403, origin)
      const notifs = readJSON(NOTIF_FILE, {})
      if (notifs[wallet]) {
        notifs[wallet] = notifs[wallet].map(n => ({ ...n, read: true }))
        writeJSON(NOTIF_FILE, notifs)
      }
      return json(res, { ok: true }, 200, origin)
    }

    // ── OFFERS ──

    // POST /api/offers — requires auth
    if (pathname === '/api/offers' && req.method === 'POST') {
      const auth = parseAuth(req)
      if (!auth.wallet || !auth.signature || !auth.nonce) return json(res, { error: 'Wallet authentication required' }, 401, origin)
      const verified = await verifySignature(auth)
      if (!verified) return json(res, { error: 'Invalid signature' }, 401, origin)

      const body = await parseBody(req)
      if (!body.listingId) return json(res, { error: 'listingId required' }, 400, origin)

      const offers = readJSON(OFFERS_FILE, [])
      const newOffer = {
        id: Date.now(),
        listingId: body.listingId,
        listingTitle: sanitize(body.listingTitle || '', 200),
        listingRole: body.listingRole || 'seller',
        listingCreator: (body.listingCreator || '').toLowerCase(),
        offererWallet: verified, // ← use verified address
        offerPrice: body.offerPrice || '0',
        collateral: body.collateral || '0',
        message: sanitize(body.message || '', 1000),
        status: 'pending',
        counterPrice: null,
        counterMessage: null,
        createdAt: Date.now(),
      }
      offers.unshift(newOffer)
      writeJSON(OFFERS_FILE, offers)
      // notify listing creator
      const notifs = readJSON(NOTIF_FILE, {})
      const to = newOffer.listingCreator
      if (!notifs[to]) notifs[to] = []
      notifs[to].unshift({
        id: Date.now(),
        message: `${newOffer.offererWallet.slice(0, 6)}…${newOffer.offererWallet.slice(-4)} offered ${newOffer.offerPrice} USDC on "${newOffer.listingTitle}"`,
        type: 'offer',
        offerId: newOffer.id,
        listingId: newOffer.listingId,
        from: newOffer.offererWallet,
        read: false,
        createdAt: Date.now(),
      })
      writeJSON(NOTIF_FILE, notifs)
      return json(res, newOffer, 201, origin)
    }

    // GET /api/offers — get offers for a wallet (both as creator and offerer)
    if (pathname === '/api/offers' && req.method === 'GET') {
      const wallet = url.searchParams.get('wallet')?.toLowerCase()
      const listingId = url.searchParams.get('listingId')
      let offers = readJSON(OFFERS_FILE, [])
      if (wallet) offers = offers.filter(o => o.listingCreator === wallet || o.offererWallet === wallet)
      if (listingId) offers = offers.filter(o => o.listingId == listingId)
      return json(res, offers, 200, origin)
    }

    // PUT /api/offers/:id/accept — creator only
    if (pathname.match(/^\/api\/offers\/\d+\/accept$/) && req.method === 'PUT') {
      const auth = parseAuth(req)
      if (!auth.wallet || !auth.signature || !auth.nonce) return json(res, { error: 'Wallet authentication required' }, 401, origin)
      const verified = await verifySignature(auth)
      if (!verified) return json(res, { error: 'Invalid signature' }, 401, origin)

      const id = parseInt(pathname.split('/')[3])
      const offers = readJSON(OFFERS_FILE, [])
      const offer = offers.find(o => o.id === id)
      if (!offer) return json(res, { error: 'Offer not found' }, 404, origin)
      if (offer.listingCreator !== verified) return json(res, { error: 'Not your offer' }, 403, origin)
      offer.status = 'accepted'
      writeJSON(OFFERS_FILE, offers)
      // notify offerer
      const notifs = readJSON(NOTIF_FILE, {})
      const to = offer.offererWallet
      if (!notifs[to]) notifs[to] = []
      notifs[to].unshift({
        id: Date.now(),
        message: `Offer accepted on "${offer.listingTitle}"! Open a room now.`,
        type: 'offer_accepted',
        offerId: offer.id,
        listingId: offer.listingId,
        from: offer.listingCreator,
        read: false,
        createdAt: Date.now(),
      })
      writeJSON(NOTIF_FILE, notifs)
      return json(res, offer, 200, origin)
    }

    // PUT /api/offers/:id/decline — creator only
    if (pathname.match(/^\/api\/offers\/\d+\/decline$/) && req.method === 'PUT') {
      const auth = parseAuth(req)
      if (!auth.wallet || !auth.signature || !auth.nonce) return json(res, { error: 'Wallet authentication required' }, 401, origin)
      const verified = await verifySignature(auth)
      if (!verified) return json(res, { error: 'Invalid signature' }, 401, origin)

      const id = parseInt(pathname.split('/')[3])
      const offers = readJSON(OFFERS_FILE, [])
      const offer = offers.find(o => o.id === id)
      if (!offer) return json(res, { error: 'Offer not found' }, 404, origin)
      if (offer.listingCreator !== verified) return json(res, { error: 'Not your offer' }, 403, origin)
      offer.status = 'declined'
      writeJSON(OFFERS_FILE, offers)
      const notifs = readJSON(NOTIF_FILE, {})
      const to = offer.offererWallet
      if (!notifs[to]) notifs[to] = []
      notifs[to].unshift({
        id: Date.now(),
        message: `Offer declined on "${offer.listingTitle}".`,
        type: 'offer_declined',
        offerId: offer.id,
        read: false,
        createdAt: Date.now(),
      })
      writeJSON(NOTIF_FILE, notifs)
      return json(res, offer, 200, origin)
    }

    // PUT /api/offers/:id/counter — creator only
    if (pathname.match(/^\/api\/offers\/\d+\/counter$/) && req.method === 'PUT') {
      const auth = parseAuth(req)
      if (!auth.wallet || !auth.signature || !auth.nonce) return json(res, { error: 'Wallet authentication required' }, 401, origin)
      const verified = await verifySignature(auth)
      if (!verified) return json(res, { error: 'Invalid signature' }, 401, origin)

      const id = parseInt(pathname.split('/')[3])
      const body = await parseBody(req)
      const offers = readJSON(OFFERS_FILE, [])
      const offer = offers.find(o => o.id === id)
      if (!offer) return json(res, { error: 'Offer not found' }, 404, origin)
      if (offer.listingCreator !== verified) return json(res, { error: 'Not your offer' }, 403, origin)
      offer.status = 'countered'
      offer.counterPrice = body.counterPrice || offer.offerPrice
      offer.counterMessage = sanitize(body.counterMessage || '', 500)
      writeJSON(OFFERS_FILE, offers)
      const notifs = readJSON(NOTIF_FILE, {})
      const to = offer.offererWallet
      if (!notifs[to]) notifs[to] = []
      notifs[to].unshift({
        id: Date.now(),
        message: `Counter-offer on "${offer.listingTitle}": ${offer.counterPrice} USDC — "${offer.counterMessage}"`,
        type: 'offer_counter',
        offerId: offer.id,
        listingId: offer.listingId,
        from: offer.listingCreator,
        read: false,
        createdAt: Date.now(),
      })
      writeJSON(NOTIF_FILE, notifs)
      return json(res, offer, 200, origin)
    }

    // ── ROOM CODES (for auto-join) ──

    // POST /api/room-codes — requires auth
    if (pathname === '/api/room-codes' && req.method === 'POST') {
      const auth = parseAuth(req)
      if (!auth.wallet || !auth.signature || !auth.nonce) return json(res, { error: 'Wallet authentication required' }, 401, origin)
      const verified = await verifySignature(auth)
      if (!verified) return json(res, { error: 'Invalid signature' }, 401, origin)

      const body = await parseBody(req)
      if (!body.roomId || !body.joinCode || !body.counterparty) {
        return json(res, { error: 'Missing fields' }, 400, origin)
      }
      const codes = readJSON(ROOM_CODES_FILE, [])
      if (!codes.find(c => c.roomId === body.roomId)) {
        codes.push({
          roomId: body.roomId,
          joinCode: sanitize(body.joinCode, 100),
          creator: verified, // verified address
          counterparty: body.counterparty.toLowerCase(),
          listingId: body.listingId || null,
          item: sanitize(body.item || '', 200),
          price: body.price || '',
          createdAt: Date.now(),
        })
        writeJSON(ROOM_CODES_FILE, codes)
      }
      return json(res, { ok: true }, 200, origin)
    }

    // GET /api/room-codes?wallet=0x... — requires auth, only own codes
    if (pathname === '/api/room-codes' && req.method === 'GET') {
      const auth = parseAuth(req)
      if (!auth.wallet || !auth.signature || !auth.nonce) return json(res, { error: 'Wallet authentication required' }, 401, origin)
      const verified = await verifySignature(auth)
      if (!verified) return json(res, { error: 'Invalid signature' }, 401, origin)

      const codes = readJSON(ROOM_CODES_FILE, [])
      // If roomId query param: return code if user is involved
      const roomId = url.searchParams.get('roomId')
      if (roomId) {
        const code = codes.find(c => c.roomId === roomId && (c.creator === verified || c.counterparty === verified))
        return json(res, code ? [code] : [], 200, origin)
      }
      // Otherwise: return all pending codes for this wallet
      const pending = codes.filter(c => c.counterparty === verified)
      return json(res, pending, 200, origin)
    }

    // ── HEALTH (no leak) ──

    if (pathname === '/api/health' && req.method === 'GET') {
      return json(res, { status: 'ok' }, 200, origin)
    }

    json(res, { error: 'Not found' }, 404, origin)
  } catch (err) {
    json(res, { error: err.message }, 500, origin)
  }
})

server.listen(PORT, () => {
  console.log(`BOND Market API on http://localhost:${PORT}`)
})

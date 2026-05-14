const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = process.env.PORT || 3001
const DATA_FILE = path.join(__dirname, 'listings.json')
const NOTIF_FILE = path.join(__dirname, 'notifications.json')
const OFFERS_FILE = path.join(__dirname, 'offers.json')
const ROOM_CODES_FILE = path.join(__dirname, 'room_codes.json')
const DISPUTES_FILE = path.join(__dirname, 'disputes.json')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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
    { id: 1, role: 'seller', title: 'Azuki NFT Whitelist Spot', description: 'Guaranteed WL for Azuki Elementals mint. Wallet surrender after purchase. Serious buyers only — DM me on Twitter first to confirm availability.', category: 'NFT', price: '0.5', collateral: '0.25', deliveryDays: 3, creator: '0xAa11000000000000000000000000000000000000', createdAt: Date.now() - 3600000, socials: { twitter: '@azuki_seller', telegram: '@azuki_deals' } },
    { id: 2, role: 'seller', title: 'MetaMask Wallet (fresh)', description: 'Brand new MetaMask wallet with no history. Full seed phrase transfer. Created specifically for multi-account farming. No KYC attached.', category: 'Wallet', price: '2.0', collateral: '1.0', deliveryDays: 1, creator: '0xBb22000000000000000000000000000000000000', createdAt: Date.now() - 7200000, socials: { discord: 'walletguy#9999' } },
    { id: 3, role: 'buyer', title: 'LF: Twitter Account 10K+', description: 'Looking for crypto-focused Twitter account with 10K+ organic followers. No bans. Budget flexible for the right account.', category: 'Account', price: '1.5', collateral: '0', deliveryDays: 7, creator: '0xCc33000000000000000000000000000000000000', createdAt: Date.now() - 10800000, socials: { telegram: '@buyer_main' } },
    { id: 4, role: 'seller', title: 'Smart Contract Audit', description: 'One Solidity contract audit, 48h turnaround, detailed PDF report with severity ratings. Experience with DeFi, NFT, and token contracts.', category: 'Service', price: '0.8', collateral: '0', deliveryDays: 2, creator: '0xDd44000000000000000000000000000000000000', createdAt: Date.now() - 14400000, socials: { discord: 'auditor#0001', twitter: '@audit_service' } },
    { id: 5, role: 'seller', title: 'Pudgy Penguins WL — 2 spots', description: 'Two whitelist spots for upcoming Pudgy Penguins mint. Price is per spot. Can buy 1 or 2. Verified by project team.', category: 'NFT', price: '0.3', collateral: '0.15', deliveryDays: 2, creator: '0xEe55000000000000000000000000000000000000', createdAt: Date.now() - 18000000, socials: { telegram: '@pudgy_wl' } },
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

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS })
  res.end(JSON.stringify(data))
}

// ═══════════════════════════════════════
//  Server
// ═══════════════════════════════════════

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS)
    return res.end()
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)
  const pathname = url.pathname

  try {
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
      return json(res, listings)
    }

    // POST /api/listings
    if (pathname === '/api/listings' && req.method === 'POST') {
      const body = await parseBody(req)
      if (!body.title || !body.price || !body.creator) return json(res, { error: 'title, price, creator required' }, 400)
      const listings = readJSON(DATA_FILE, [])
      const newListing = {
        id: Date.now(),
        role: body.role || 'seller',
        title: body.title,
        description: body.description || '',
        category: body.category || 'Other',
        price: body.price,
        collateral: body.collateral || '0',
        deliveryDays: body.deliveryDays || 5,
        dealType: body.dealType || 0,
        creator: body.creator,
        socials: body.socials || undefined,
        createdAt: Date.now(),
      }
      listings.unshift(newListing)
      writeJSON(DATA_FILE, listings)
      return json(res, newListing, 201)
    }

    // DELETE /api/listings/:id
    if (pathname.startsWith('/api/listings/') && req.method === 'DELETE') {
      const id = parseInt(pathname.split('/')[3])
      const body = await parseBody(req).catch(() => ({}))
      const listings = readJSON(DATA_FILE, [])
      const idx = listings.findIndex(l => l.id === id)
      if (idx === -1) return json(res, { error: 'Not found' }, 404)
      if (body.creator && listings[idx].creator.toLowerCase() !== body.creator.toLowerCase()) {
        return json(res, { error: 'Not your listing' }, 403)
      }
      listings.splice(idx, 1)
      writeJSON(DATA_FILE, listings)
      return json(res, { ok: true })
    }

    // PUT /api/listings/:id/taken — mark listing as taken
    if (pathname.startsWith('/api/listings/') && pathname.endsWith('/taken') && req.method === 'PUT') {
      const id = parseInt(pathname.split('/')[3])
      const body = await parseBody(req)
      const listings = readJSON(DATA_FILE, [])
      const listing = listings.find(l => l.id === id)
      if (!listing) return json(res, { error: 'Not found' }, 404)
      listing.taken = true
      listing.takenBy = body.creator || ''
      listing.takenRoomId = body.roomId || ''
      listing.takenAt = Date.now()
      writeJSON(DATA_FILE, listings)
      return json(res, listing)
    }

    // ── NOTIFICATIONS ──

    // GET /api/notifications/:wallet
    if (pathname.startsWith('/api/notifications/') && req.method === 'GET') {
      const wallet = pathname.split('/')[3]?.toLowerCase()
      if (!wallet) return json(res, { error: 'wallet required' }, 400)
      const notifs = readJSON(NOTIF_FILE, {})
      const userNotifs = notifs[wallet] || []
      return json(res, userNotifs)
    }

    // POST /api/notifications
    if (pathname === '/api/notifications' && req.method === 'POST') {
      const body = await parseBody(req)
      if (!body.to || !body.message) return json(res, { error: 'to, message required' }, 400)
      const notifs = readJSON(NOTIF_FILE, {})
      const to = body.to.toLowerCase()
      if (!notifs[to]) notifs[to] = []
      notifs[to].unshift({
        id: Date.now(),
        message: body.message,
        listingId: body.listingId || null,
        from: body.from || null,
        read: false,
        createdAt: Date.now(),
      })
      writeJSON(NOTIF_FILE, notifs)
      return json(res, { ok: true }, 201)
    }

    // POST /api/notifications/:wallet/read — mark all as read
    if (pathname.startsWith('/api/notifications/') && pathname.endsWith('/read') && req.method === 'POST') {
      const wallet = pathname.split('/')[3]?.toLowerCase()
      if (!wallet) return json(res, { error: 'wallet required' }, 400)
      const notifs = readJSON(NOTIF_FILE, {})
      if (notifs[wallet]) {
        notifs[wallet] = notifs[wallet].map(n => ({ ...n, read: true }))
        writeJSON(NOTIF_FILE, notifs)
      }
      return json(res, { ok: true })
    }

    // ── OFFERS ──

    // POST /api/offers — make an offer
    if (pathname === '/api/offers' && req.method === 'POST') {
      const body = await parseBody(req)
      if (!body.listingId || !body.offererWallet) return json(res, { error: 'listingId, offererWallet required' }, 400)
      const offers = readJSON(OFFERS_FILE, [])
      const newOffer = {
        id: Date.now(),
        listingId: body.listingId,
        listingTitle: body.listingTitle || '',
        listingRole: body.listingRole || 'seller',
        listingCreator: (body.listingCreator || '').toLowerCase(),
        offererWallet: body.offererWallet.toLowerCase(),
        offerPrice: body.offerPrice || '0',
        collateral: body.collateral || '0',
        message: body.message || '',
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
      return json(res, newOffer, 201)
    }

    // GET /api/offers — get offers for a wallet (both as creator and offerer)
    if (pathname === '/api/offers' && req.method === 'GET') {
      const wallet = url.searchParams.get('wallet')?.toLowerCase()
      const listingId = url.searchParams.get('listingId')
      let offers = readJSON(OFFERS_FILE, [])
      if (wallet) offers = offers.filter(o => o.listingCreator === wallet || o.offererWallet === wallet)
      if (listingId) offers = offers.filter(o => o.listingId == listingId)
      return json(res, offers)
    }

    // PUT /api/offers/:id/accept
    if (pathname.match(/^\/api\/offers\/\d+\/accept$/) && req.method === 'PUT') {
      const id = parseInt(pathname.split('/')[3])
      const offers = readJSON(OFFERS_FILE, [])
      const offer = offers.find(o => o.id === id)
      if (!offer) return json(res, { error: 'Offer not found' }, 404)
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
      return json(res, offer)
    }

    // PUT /api/offers/:id/decline
    if (pathname.match(/^\/api\/offers\/\d+\/decline$/) && req.method === 'PUT') {
      const id = parseInt(pathname.split('/')[3])
      const offers = readJSON(OFFERS_FILE, [])
      const offer = offers.find(o => o.id === id)
      if (!offer) return json(res, { error: 'Offer not found' }, 404)
      offer.status = 'declined'
      writeJSON(OFFERS_FILE, offers)
      // notify offerer
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
      return json(res, offer)
    }

    // PUT /api/offers/:id/counter
    if (pathname.match(/^\/api\/offers\/\d+\/counter$/) && req.method === 'PUT') {
      const id = parseInt(pathname.split('/')[3])
      const body = await parseBody(req)
      const offers = readJSON(OFFERS_FILE, [])
      const offer = offers.find(o => o.id === id)
      if (!offer) return json(res, { error: 'Offer not found' }, 404)
      offer.status = 'countered'
      offer.counterPrice = body.counterPrice || offer.offerPrice
      offer.counterMessage = body.counterMessage || ''
      writeJSON(OFFERS_FILE, offers)
      // notify offerer
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
      return json(res, offer)
    }

    // ── ROOM CODES (for auto-join) ──

    // POST /api/room-codes — store join code after room creation
    if (pathname === '/api/room-codes' && req.method === 'POST') {
      const body = await parseBody(req)
      if (!body.roomId || !body.joinCode || !body.creator || !body.counterparty) {
        return json(res, { error: 'Missing fields' }, 400)
      }
      const codes = readJSON(ROOM_CODES_FILE, [])
      // Don't duplicate
      if (!codes.find(c => c.roomId === body.roomId)) {
        codes.push({
          roomId: body.roomId,
          joinCode: body.joinCode,
          creator: body.creator.toLowerCase(),
          counterparty: body.counterparty.toLowerCase(),
          item: body.item || '',
          price: body.price || '',
          createdAt: Date.now(),
        })
        writeJSON(ROOM_CODES_FILE, codes)
      }
      return json(res, { ok: true })
    }

    // GET /api/room-codes?wallet=0x... OR /api/room-codes/:wallet — get pending rooms
    if ((pathname === '/api/room-codes' || pathname.startsWith('/api/room-codes/')) && req.method === 'GET') {
      const roomId = url.searchParams.get('roomId')
      const wallet = url.searchParams.get('wallet') || pathname.split('/')[3]
      const codes = readJSON(ROOM_CODES_FILE, [])
      if (roomId) {
        const code = codes.find(c => c.roomId == roomId)
        return json(res, code ? [code] : [])
      }
      if (!wallet) return json(res, [])
      const pending = codes
        .filter(c => c.counterparty === wallet.toLowerCase())
        .filter(c => !c.createdAt || Date.now() - c.createdAt < 86400000) // filter stale (>24h)
      return json(res, pending)
    }

    // ── DISPUTES ──

    // POST /api/disputes — log a new dispute
    if (pathname === '/api/disputes' && req.method === 'POST') {
      const body = await parseBody(req)
      if (!body.roomId) return json(res, { error: 'roomId required' }, 400)
      const disputes = readJSON(DISPUTES_FILE, [])
      // Avoid duplicates
      if (!disputes.find(d => d.roomId === body.roomId)) {
        disputes.unshift({
          roomId: body.roomId,
          item: body.item || '',
          price: body.price || '',
          collateral: body.collateral || '0',
          creator: (body.creator || '').toLowerCase(),
          counterparty: (body.counterparty || '').toLowerCase(),
          disputedBy: (body.disputedBy || '').toLowerCase(),
          reason: body.reason || '',
          evidenceRef: body.evidenceRef || '',
          status: 'open',
          resolvedAt: null,
          resolution: null,
          createdAt: Date.now(),
        })
        writeJSON(DISPUTES_FILE, disputes)
      }
      return json(res, { ok: true }, 201)
    }

    // GET /api/disputes — list open disputes (or all)
    if (pathname === '/api/disputes' && req.method === 'GET') {
      const status = url.searchParams.get('status') || 'open'
      let disputes = readJSON(DISPUTES_FILE, [])
      if (status === 'open') disputes = disputes.filter(d => d.status === 'open')
      if (status === 'resolved') disputes = disputes.filter(d => d.status === 'resolved')
      return json(res, disputes)
    }

    // PUT /api/disputes/:roomId/resolve — mark resolved
    if (pathname.match(/^\/api\/disputes\/\d+\/resolve$/) && req.method === 'PUT') {
      const roomId = pathname.split('/')[3]
      const body = await parseBody(req)
      const disputes = readJSON(DISPUTES_FILE, [])
      const d = disputes.find(x => x.roomId === roomId)
      if (!d) return json(res, { error: 'Dispute not found' }, 404)
      d.status = 'resolved'
      d.resolvedAt = Date.now()
      d.resolution = body.resolution || 'unknown'
      d.resolvedBy = (body.resolvedBy || '').toLowerCase()
      writeJSON(DISPUTES_FILE, disputes)
      return json(res, d)
    }

    // ── HEALTH ──

    if (pathname === '/api/health' && req.method === 'GET') {
      return json(res, { status: 'ok', listings: readJSON(DATA_FILE, []).length, offers: readJSON(OFFERS_FILE, []).length })
    }

    json(res, { error: 'Not found' }, 404)
  } catch (err) {
    json(res, { error: err.message }, 500)
  }
})

server.listen(PORT, () => {
  console.log(`BOND Market API on http://localhost:${PORT}`)
})

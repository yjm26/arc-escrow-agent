const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = process.env.PORT || 3001
const DATA_FILE = path.join(__dirname, 'listings.json')
const NOTIF_FILE = path.join(__dirname, 'notifications.json')
const OFFERS_FILE = path.join(__dirname, 'offers.json')
const EVIDENCE_FILE = path.join(__dirname, 'evidence.json')

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
    if (pathname.match(/^\/api\/listings\/\d+\/taken$/) && req.method === 'PUT') {
      const id = parseInt(pathname.split('/')[3])
      const listings = readJSON(DATA_FILE, [])
      const listing = listings.find(l => l.id === id)
      if (!listing) return json(res, { error: 'Not found' }, 404)
      listing.taken = true
      listing.takenBy = (await parseBody(req).catch(() => ({}))).creator || ''
      listing.takenAt = Date.now()
      writeJSON(DATA_FILE, listings)
      return json(res, { ok: true })
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
        type: body.type || 'counter', // 'accept' = same price, 'counter' = different price
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
        message: newOffer.type === 'accept'
          ? `${newOffer.offererWallet.slice(0, 6)}…${newOffer.offererWallet.slice(-4)} accepted your listing at ${newOffer.offerPrice} USDC`
          : `${newOffer.offererWallet.slice(0, 6)}…${newOffer.offererWallet.slice(-4)} offered ${newOffer.offerPrice} USDC on "${newOffer.listingTitle}"`,
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

    // ── ROOM CODES (for auto-join when buyer creates from market) ──

    // POST /api/room-codes — store join code so seller can auto-join
    const ROOM_CODES_FILE = path.join(__dirname, 'room-codes.json')
    if (pathname === '/api/room-codes' && req.method === 'POST') {
      const body = await parseBody(req)
      if (!body.roomId || !body.joinCode || !body.counterparty) return json(res, { error: 'roomId, joinCode, counterparty required' }, 400)
      const codes = readJSON(ROOM_CODES_FILE, [])
      const entry = {
        id: Date.now(),
        roomId: body.roomId,
        joinCode: body.joinCode,
        creator: (body.creator || '').toLowerCase(),
        counterparty: body.counterparty.toLowerCase(),
        item: body.item || '',
        price: body.price || '0',
        createdAt: Date.now(),
      }
      codes.unshift(entry)
      writeJSON(ROOM_CODES_FILE, codes)
      // notify seller/counterparty
      const notifs = readJSON(NOTIF_FILE, {})
      const to = entry.counterparty
      if (!notifs[to]) notifs[to] = []
      notifs[to].unshift({
        id: Date.now(),
        message: `Someone bought "${entry.item}" at ${entry.price} USDC! Join the room to complete the deal.`,
        type: 'room_ready',
        roomId: entry.roomId,
        from: entry.creator,
        read: false,
        createdAt: Date.now(),
      })
      writeJSON(NOTIF_FILE, notifs)
      return json(res, entry, 201)
    }

    // GET /api/room-codes/:wallet — get pending room codes for a wallet
    if (pathname.startsWith('/api/room-codes/') && req.method === 'GET') {
      const wallet = pathname.split('/')[3]?.toLowerCase()
      if (!wallet) return json(res, { error: 'wallet required' }, 400)
      const codes = readJSON(ROOM_CODES_FILE, [])
      const pending = codes.filter(c => c.counterparty === wallet)
      return json(res, pending)
    }

    // ── EVIDENCE ──

    // POST /api/evidence/:roomId — submit evidence
    if (pathname.match(/^\/api\/evidence\/\d+$/) && req.method === 'POST') {
      const roomId = parseInt(pathname.split('/')[3])
      const body = await parseBody(req)
      if (!body.submitter || !body.evidenceType || !body.evidenceRef) {
        return json(res, { error: 'submitter, evidenceType, evidenceRef required' }, 400)
      }
      const evidence = readJSON(EVIDENCE_FILE, {})
      if (!evidence[roomId]) evidence[roomId] = []
      const entry = {
        id: Date.now(),
        roomId,
        submitter: body.submitter.toLowerCase(),
        evidenceType: body.evidenceType,
        description: body.description || '',
        evidenceRef: body.evidenceRef,
        timestamp: Date.now(),
      }
      evidence[roomId].push(entry)
      writeJSON(EVIDENCE_FILE, evidence)
      return json(res, entry, 201)
    }

    // GET /api/evidence/:roomId — list evidence for a room
    if (pathname.match(/^\/api\/evidence\/\d+$/) && req.method === 'GET') {
      const roomId = parseInt(pathname.split('/')[3])
      const evidence = readJSON(EVIDENCE_FILE, {})
      return json(res, evidence[roomId] || [])
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

# BOND — Roadmap & Future Plans

## Current State (Hackathon MVP)
- ✅ Smart contract V11 — collateral at creation, arbiter disputes
- ✅ React frontend — Create, Room View, Market, Docs
- ✅ JSON backend — shared listings (port 3001)
- ✅ Docs site — /docs with collateral, disputes, timers, FAQ
- ✅ Market — expandable listings, social contacts, category filter

## Architecture for Production

```
FRONTEND                    API LAYER                   DATA LAYER
Next.js (SSR)          Express / Hono              PostgreSQL + Prisma
React + Tailwind       REST + WebSocket            Redis (cache/pubsub)
ethers.js v6           SIWE auth                   IPFS (proofs/images)
                       Rate limiting               Push (TG/email)

BLOCKCHAIN LAYER
Arc Testnet → Mainnet
BondRoom Contract (V11+)
Event Indexer (Subgraph)
```

## Phase 2 — Post-Hackathon

### 2.1 Database Migration
- PostgreSQL + Prisma ORM
- Tables: users, listings, orders, reviews, disputes
- Migrate from JSON file to proper DB

### 2.2 Auth — SIWE (Sign-In with Ethereum)
- Wallet connects → sign message → backend verify → JWT
- No email/password. Wallet = identity
- npm: siwe, @auth/core

### 2.3 Event Indexer
- Listen on-chain events → sync to DB
- RoomCreated → create order record
- RoomFunded → update order status
- RoomReleased → complete order, update reputation
- RoomDisputed → create dispute record
- Options: The Graph subgraph, or custom listener with ethers.js

### 2.4 Reputation System
- After each completed deal, buyer rates seller (1-5 stars)
- Track: deals_completed, avg_rating, disputes_lost
- Display on listings and profiles

### 2.5 Real-time Updates
- WebSocket or Server-Sent Events
- New listing → broadcast to browsers
- Room status change → notify parties
- Use Redis pub/sub for multi-server

### 2.6 Image/Proof Upload
- IPFS for delivery proof images
- Pinata or web3.storage for pinning
- Upload on markDelivered → store hash on-chain

## Phase 3 — Mainnet Launch

### 3.1 Security
- Smart contract audit (manual + Slither/Mythril)
- Penetration testing on API
- Rate limiting, input sanitization
- CORS lockdown

### 3.2 Notifications
- Telegram bot — deal updates, dispute alerts
- Email notifications via Resend/SendGrid
- In-app notification center

### 3.3 Mobile
- Responsive polish (already mostly there)
- PWA support (install as app)
- WalletConnect v2 for mobile wallets

### 3.4 Marketing
- Landing page with demo video
- Twitter/X presence
- Discord community
- Hackathon submission + demo

## Tech Stack Summary

| Layer | Tech | Why |
|-------|------|-----|
| Frontend | Next.js 14 | SSR, SEO, API routes |
| Auth | SIWE | Wallet-native |
| DB | PostgreSQL + Prisma | Type-safe, relational |
| Cache | Redis | Session, rate limit, pub/sub |
| Real-time | WebSocket | Live updates |
| Indexer | Custom / Subgraph | On-chain sync |
| Storage | IPFS / S3 | Proofs, images |
| Notify | Telegram Bot + Email | Deal updates |
| Deploy | Vercel + Railway | Auto-scale |
| Monitor | Sentry + Grafana | Error tracking |

## Key Files
- contracts/BondRoomV11.sol — current deployed contract
- backend/server.js — JSON API server
- frontend/src/components/Market.jsx — marketplace UI
- frontend/src/components/RoomView.jsx — escrow room UI
- frontend/src/components/Docs.jsx — documentation

## Deployed
- Contract: 0xb9C68647bC0441A4b5c2ef939282C3B278874a80 (Arc Testnet)
- Backend: http://localhost:3001
- Frontend: http://localhost:5173

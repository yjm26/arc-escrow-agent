# BOND Escrow Roadmap

## Phase 1 \u2705 Complete
- Global Toast notification system (context + container)
- RoomView ActionPanel consolidation (all actions extracted)
- Live countdown timer fix (clean format, exact match styling)
- Offers deduplication (shared `useOffers` hook)

## Phase 2 \u2705 Complete
- Smart polling with visibility awareness + exponential backoff
- TX retry logic (2 retries, 1s/2s backoff, skip on user rejection)
- Skeleton loading states for RoomView
- Better ErrorBoundary (reload + retry, stack trace preview)

## Phase 3 \u2705 Complete
- Arbiter Dashboard (`/arbiter`)
  - Backend disputes storage (POST/GET/PUT endpoints)
  - RoomView auto-registers dispute to backend on openDispute TX
  - Arbiter-only Navbar link (red, conditional on `isAdmin`)
  - List open disputes with room details, parties, reason, evidence
  - Smart polling for live updates
  - Mark resolved tracking (backend-only, no contract change)

## Phase 4 \uD83D\uDD32 Multi-Arbiter System (Contract V2)
> **Note:** Requires contract redeploy. Current contract has single fixed arbiter.

### Contract Changes
- `arbiterRegistry` \u2014 mapping of registered arbiters with stake
- `takeCase(uint256 roomId)` \u2014 any registered arbiter can claim an open dispute
- `assignedArbiter[roomId]` \u2014 tracks who took each case
- `resolveAsArbiter(...)` \u2014 only assigned arbiter can resolve
- Arbiter staking / bond mechanism (prevents ghosting after taking case)
- Arbiter reputation scoring (win rate, speed, fairness)

### Frontend Changes
- Arbiter registration flow (stake USDC to become arbiter)
- `/arbiter` dashboard shows "Open Cases" (unclaimed) + "My Cases" (claimed)
- "Take Case" button on open disputes (TX to contract)
- Arbiter leaderboard / reputation display
- Case assignment history

### Backend Changes
- Arbiter registry sync from chain events
- Case assignment notifications
- Arbiter performance analytics

## Phase 5 \uD83D\uDD32 Notifications & UX Polish
- Push/web notifications for state changes
- Email/Discord webhook for arbiter alerts
- Mobile-responsive refinements
- PWA support (offline skeleton, add to home screen)

## Phase 6 \uD83D\uDD32 Advanced Features
- Batch operations (create multiple rooms, bulk fund)
- Dispute mediation chat (encrypted between parties + arbiter)
- Auto-escalation timer (seller can auto-escalate after confirm window)
- Partial release (arbiter can split funds arbitrarily, not just 50/50)
- Appeal mechanism (loser can appeal to higher arbiter with larger stake)

---

*Last updated: after Phase 3 commit*

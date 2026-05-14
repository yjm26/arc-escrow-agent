import { useToast } from '../../hooks/useToast'

export default function ActionPanel({
  room, id, isCreator, isSeller, isBuyer, isAdmin, isParticipant,
  arbiterName, totalUSDC, joinCode, copied,
  canExpire, canEscalate, canBuyerRefund,
  handleJoin, handleFund, handleDeliver, handleRelease,
  handleBuyerRefund, handleCancel, handleLeave, handleExpire,
  handleEscalate, handleArbRelease, handleArbRefund, handleArbSplit,
  copyInvite,
  // Dispute form state
  showDisputeForm, setShowDisputeForm,
  disputeReason, setDisputeReason,
  handleDispute,
  // Mutual cancel
  canMutualCancel,
  mutualCancelStatus,
  hasApprovedMutualCancel,
  counterpartyApprovedMutualCancel,
  mutualCancelReady,
  handleRequestMutualCancel,
  handleRevokeMutualCancel,
  handleExecuteMutualCancel,
  txPending,
}) {
  const { addToast } = useToast()

  const wrap = async (fn, label, successMsg) => {
    addToast(label, 'info')
    try {
      const ok = await fn()
      if (ok !== false) addToast(successMsg, 'ok')
      return ok
    } catch (e) {
      addToast(e.reason || e.message || 'Transaction failed', 'err')
      throw e
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ─── CREATED ─── */}
      {room.state === 'Created' && canExpire && (
        <button onClick={() => wrap(handleExpire, 'Expiring room\u2026', 'Room expired.')} disabled={txPending} className="btn-ghost w-full py-3 text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed">
          Expired — Close Room
        </button>
      )}
      {room.state === 'Created' && !canExpire && !isCreator && (
        <button onClick={handleJoin} disabled={txPending || !joinCode} className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">
          {!joinCode ? 'Need invite link' : 'Join Room (FREE)'}
        </button>
      )}
      {room.state === 'Created' && !canExpire && isCreator && (
        <>
          <button onClick={copyInvite} className="btn-primary w-full py-3">
            {copied ? '\u2713 Copied!' : 'Copy Invite Link'}
          </button>
          <button onClick={() => wrap(handleCancel, 'Cancelling room\u2026', 'Room cancelled.')} disabled={txPending} className="btn-ghost w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">Cancel Room</button>
        </>
      )}

      {/* ─── JOINED ─── */}
      {room.state === 'Joined' && canExpire && (
        <button onClick={() => wrap(handleExpire, 'Expiring room\u2026', 'Room expired.')} disabled={txPending} className="btn-ghost w-full py-3 text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed">
          Expired — Close Room
        </button>
      )}
      {room.state === 'Joined' && !canExpire && isBuyer && (
        <>
          <button onClick={() => wrap(handleFund, 'Funding room\u2026', 'Room funded!')} disabled={txPending} className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">Fund {totalUSDC} USDC</button>
          <button onClick={() => wrap(handleLeave, 'Leaving room\u2026', 'Left room.')} disabled={txPending} className="btn-ghost w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">Leave Room</button>
        </>
      )}
      {room.state === 'Joined' && !canExpire && isSeller && (
        <>
          <div className="text-[13px] text-stripe-body dark:text-gray-400 text-center py-1">Waiting for buyer to fund (30m deadline)…</div>
          <button onClick={() => wrap(handleLeave, 'Leaving room\u2026', 'Left room.')} disabled={txPending} className="btn-ghost w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">Leave Room</button>
        </>
      )}

      {/* ─── FUNDED ─── */}
      {room.state === 'Funded' && isSeller && (
        <div className="space-y-3">
          {Number(room.collateralAmount) > 0 && (
            <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded p-3">
              <div className="text-[12px] text-green-700 dark:text-green-400 font-medium">Collateral Locked: {room.collateralAmount} USDC</div>
            </div>
          )}
          <div className="text-[12px] text-stripe-body dark:text-gray-400 text-center">
            Click below once you've sent the item to buyer.
          </div>
          <button onClick={() => wrap(handleDeliver, 'Confirming delivery\u2026', 'Delivered! Buyer can now release funds.')} disabled={txPending} className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">
            {txPending ? 'Processing\u2026' : 'I delivered'}
          </button>
        </div>
      )}
      {room.state === 'Funded' && isBuyer && (
        <>
          <div className="text-[13px] text-stripe-body dark:text-gray-400 text-center py-1">Waiting for seller to deliver…</div>
          {Number(room.collateralAmount) > 0 && (
            <div className="text-[12px] text-green-600 dark:text-green-400 text-center py-1">Seller locked {room.collateralAmount} USDC collateral</div>
          )}
          {canBuyerRefund && (
            <button onClick={() => wrap(handleBuyerRefund, 'Requesting refund\u2026', 'Refunded! You receive price + collateral.')} disabled={txPending} className="btn-ghost w-full py-3 text-red-600 disabled:opacity-50 disabled:cursor-not-allowed">Refund — Seller didn't deliver</button>
          )}
        </>
      )}

      {/* ─── DELIVERED ─── */}
      {room.state === 'Delivered' && isBuyer && (
        <>
          <button onClick={() => wrap(handleRelease, 'Confirming receipt\u2026', 'Funds released to seller!')} disabled={txPending} className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">Confirm Received</button>
          <button onClick={() => setShowDisputeForm(!showDisputeForm)} className="btn-ghost w-full py-3 text-red-600 border-red-200 hover:bg-red-50">⚖️ Open Dispute</button>
        </>
      )}
      {room.state === 'Delivered' && isSeller && canEscalate && (
        <button onClick={() => wrap(handleEscalate, 'Escalating to arbiter\u2026', 'Escalated! Arbiter will review.')} disabled={txPending} className="btn-ghost w-full py-3 text-amber-600 border-amber-200 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed">
          \u23F0 Escalate to Arbiter — Buyer Ghosting
        </button>
      )}
      {room.state === 'Delivered' && isSeller && !canEscalate && (
        <div className="text-[13px] text-stripe-body dark:text-gray-400 text-center py-1">Waiting for buyer to confirm receipt…</div>
      )}

      {/* ─── Dispute Form ─── */}
      {showDisputeForm && room.state === 'Delivered' && (
        <div className="bg-red-50 border border-red-200 rounded p-4 space-y-3">
          <div className="text-[13px] font-medium text-red-700">⚖️ Open Dispute</div>
          <div className="text-[11px] text-red-500">Explain the problem in short. This opens a case for arbiter review.</div>
          <textarea
            placeholder="Why are you disputing? (e.g. item not received, wrong item, seller unresponsive)"
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded border border-red-200 text-[13px] bg-white dark:bg-[#1a1d2e] resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleDispute} disabled={txPending || !disputeReason.trim()} className="btn-primary flex-1 py-2.5 text-[13px] disabled:opacity-50 disabled:cursor-not-allowed">Submit Dispute</button>
            <button onClick={() => setShowDisputeForm(false)} className="btn-ghost flex-1 py-2.5 text-[13px]">Cancel</button>
          </div>
        </div>
      )}

      {/* ─── DISPUTED ─── */}
      {room.state === 'Disputed' && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <div className="text-[13px] text-red-700 font-medium text-center mb-1">⚖️ Under Dispute</div>
          <div className="text-[12px] text-red-500 text-center mb-3">{arbiterName} will review and decide on-chain</div>

          {isParticipant && disputeReason && (
            <div className="bg-white dark:bg-[#1a1d2e] border border-red-100 rounded p-3 mb-3">
              <div className="text-[10px] font-mono uppercase tracking-[2px] text-red-400 mb-1">Reason</div>
              <div className="text-[13px] text-stripe-navy dark:text-white">{disputeReason}</div>
            </div>
          )}

          {isAdmin && (
            <div className="flex flex-col gap-2 mt-3">
              <button onClick={() => wrap(handleArbRelease, 'Resolving\u2026', 'Released to seller!')} disabled={txPending} className="btn-primary w-full py-2.5 text-[13px] disabled:opacity-50 disabled:cursor-not-allowed">Release to Seller</button>
              <button onClick={() => wrap(handleArbRefund, 'Resolving\u2026', 'Refunded to buyer!')} disabled={txPending} className="btn-ghost w-full py-2.5 text-[13px] disabled:opacity-50 disabled:cursor-not-allowed">Refund to Buyer</button>
              <button onClick={() => wrap(handleArbSplit, 'Splitting\u2026', '50/50 split executed!')} disabled={txPending} className="btn-ghost w-full py-2.5 text-[13px] disabled:opacity-50 disabled:cursor-not-allowed">50/50 Split</button>
            </div>
          )}
          {!isAdmin && (
            <div className="text-[12px] text-red-500 text-center mt-2">Awaiting arbiter decision. Funds are safe.</div>
          )}
        </div>
      )}

      {/* ─── MUTUAL CANCEL ─── */}
      {canMutualCancel && (
        <div className={`rounded-lg border p-4 ${mutualCancelReady ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 dark:bg-white/5 border-stripe-border dark:border-white/10'}`}>
          <div className="text-[10px] font-mono uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-2">Mutual Cancel</div>
          {mutualCancelReady ? (
            <>
              <div className="text-[13px] font-medium text-amber-800 mb-1 text-center">Both parties agreed <span className="font-mono">(2/2)</span></div>
              <div className="text-[11px] text-amber-600 text-center mb-3">All funds will be refunded. No fees.</div>
              <button onClick={() => wrap(handleExecuteMutualCancel, 'Executing mutual cancel\u2026', 'Deal cancelled. All funds refunded.')} disabled={txPending} className="w-full py-2.5 rounded text-[13px] font-medium bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 transition disabled:opacity-50 disabled:cursor-not-allowed">
                Execute Mutual Cancel
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${mutualCancelStatus.creatorApproved ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <span className="text-[11px] text-stripe-body dark:text-gray-400">Creator</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stripe-body dark:text-gray-400">Counterparty</span>
                  <div className={`w-2 h-2 rounded-full ${mutualCancelStatus.counterpartyApproved ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                </div>
              </div>
              <div className="text-[12px] text-stripe-body dark:text-gray-400 text-center mb-3">
                {hasApprovedMutualCancel
                  ? 'You approved. Waiting for counterparty (1/2).'
                  : counterpartyApprovedMutualCancel
                  ? 'Counterparty approved. Your turn (1/2).'
                  : 'Both parties must agree to cancel (0/2).'}
              </div>
              {!hasApprovedMutualCancel && (
                <button onClick={() => wrap(handleRequestMutualCancel, 'Requesting mutual cancel\u2026', 'You approved mutual cancel. Waiting for counterparty.')} disabled={txPending} className="btn-ghost w-full py-2.5 text-[12px] disabled:opacity-50 disabled:cursor-not-allowed">
                  Request Mutual Cancel
                </button>
              )}
              {hasApprovedMutualCancel && !counterpartyApprovedMutualCancel && (
                <>
                  <div className="text-[11px] text-stripe-body dark:text-gray-400 text-center py-2">Waiting for counterparty to approve…</div>
                  <button onClick={() => wrap(handleRevokeMutualCancel, 'Revoking\u2026', 'You revoked your approval.')} disabled={txPending} className="btn-ghost w-full py-2 text-[11px] text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed">
                    Revoke Approval
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── TERMINAL ─── */}
      {['Released', 'Refunded', 'Expired', 'Cancelled'].includes(room.state) && (
        <div className="text-stripe-body dark:text-gray-400 text-[13px] text-center py-2 bg-gray-50 dark:bg-white/5 rounded">
          This deal is closed.
        </div>
      )}
    </div>
  )
}

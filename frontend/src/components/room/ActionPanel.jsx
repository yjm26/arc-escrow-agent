export default function ActionPanel({
  room, id, isCreator, isSeller, isBuyer, isArbiter,
  arbiterName, totalUSDC, joinCode, copied, proofInput, setProofInput,
  canExpire, canAutoRelease, canBuyerRefund, canDisputeTimeout,
  handleJoin, handleFund, handleDeliver, handleRelease, handleDispute,
  handleBuyerRefund, handleCancel, handleLeave, handleExpire,
  handleAutoRelease, handleDisputeTimeout, handleArbRelease,
  handleArbRefund, handleArbSplit, copyInvite, handleLockCollateral,
}) {
  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* CREATED */}
      {room.state === 'Created' && !isCreator && (
        <button onClick={handleJoin} disabled={!joinCode} className="btn-primary w-full py-3">
          {!joinCode ? 'Need invite link' : 'Join Room (FREE)'}
        </button>
      )}
      {room.state === 'Created' && isCreator && (
        <>
          <button onClick={copyInvite} className="btn-primary w-full py-3">
            {copied ? '✓ Copied!' : 'Copy Invite Link'}
          </button>
          {!canExpire && (
            <button onClick={handleCancel} className="btn-ghost w-full py-3">Cancel Room</button>
          )}
        </>
      )}

      {/* JOINED */}
      {room.state === 'Joined' && isBuyer && (
        <>
          <button onClick={handleFund} className="btn-primary w-full py-3">Fund {totalUSDC} USDC</button>
          <button onClick={handleLeave} className="btn-ghost w-full py-3">Leave Room</button>
        </>
      )}
      {room.state === 'Joined' && isSeller && (
        <>
          <div className="text-[13px] text-stripe-body dark:text-gray-400 text-center py-1">Waiting for buyer to fund (30m deadline)…</div>
          <button onClick={handleLeave} className="btn-ghost w-full py-3">Leave Room</button>
        </>
      )}

      {/* FUNDED */}
      {room.state === 'Funded' && isSeller && (
        <div className="space-y-3">
          {Number(room.collateralAmount) > 0 && (
            <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded p-3">
              <div className="text-[12px] text-green-700 dark:text-green-400 font-medium">Collateral Locked: {room.collateralAmount} USDC</div>
            </div>
          )}
          <div>
            <label className="text-[12px] text-stripe-body dark:text-gray-400 mb-1.5 block font-mono uppercase tracking-[1px]">Delivery proof (optional)</label>
            <input
              className="stripe-input"
              placeholder="Tracking #, receipt ID, or note"
              value={proofInput}
              onChange={(e) => setProofInput(e.target.value)}
            />
            <p className="text-[11px] text-stripe-body dark:text-gray-400 mt-1">Hashed on-chain for dispute evidence</p>
          </div>
          <button onClick={handleDeliver} className="btn-primary w-full py-3">Item Given ✓</button>
        </div>
      )}
      {room.state === 'Funded' && isBuyer && (
        <>
          <div className="text-[13px] text-stripe-body dark:text-gray-400 text-center py-1">Waiting for seller to deliver (4h deadline)…</div>
          {Number(room.collateralAmount) > 0 && (
            <div className="text-[12px] text-green-600 dark:text-green-400 text-center py-1">Seller locked {room.collateralAmount} USDC collateral</div>
          )}
          {canBuyerRefund && (
            <button onClick={handleBuyerRefund} className="btn-ghost w-full py-3 text-red-600">Refund — Seller didn't deliver</button>
          )}
        </>
      )}

      {/* DELIVERED */}
      {room.state === 'Delivered' && isBuyer && (
        <>
          <button onClick={handleRelease} className="btn-primary w-full py-3">Confirm Received</button>
          <button onClick={handleDispute} className="btn-ghost w-full py-3">Dispute</button>
        </>
      )}
      {room.state === 'Delivered' && isSeller && canAutoRelease && (
            <button onClick={handleAutoRelease} className="btn-ghost w-full py-3">Claim Auto-Release</button>
      )}
      {room.state === 'Delivered' && isSeller && !canAutoRelease && (
        <div className="text-[13px] text-stripe-body dark:text-gray-400 text-center py-1">Waiting for buyer to confirm receipt…</div>
      )}

      {/* DISPUTED */}
      {room.state === 'Disputed' && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <div className="text-[13px] text-red-700 font-medium text-center mb-1">Under Dispute</div>
          <div className="text-[12px] text-red-500 text-center mb-3">{arbiterName} will review and decide</div>
          {isArbiter && (
            <div className="flex flex-col gap-2">
              <button onClick={handleArbRelease} className="btn-primary w-full py-2.5 text-[13px]">Release to Seller</button>
              <button onClick={handleArbRefund} className="btn-ghost w-full py-2.5 text-[13px]">Refund to Buyer</button>
              <button onClick={handleArbSplit} className="btn-ghost w-full py-2.5 text-[13px]">50/50 Split</button>
            </div>
          )}
          {canDisputeTimeout && isSeller && (
            <button onClick={handleDisputeTimeout} className="btn-primary w-full py-2.5 text-[13px] mt-2">Claim — Arbiter timed out</button>
          )}
          {canDisputeTimeout && isBuyer && (
            <div className="text-[12px] text-red-500 text-center mt-2">
              Arbiter timed out — seller can claim
            </div>
          )}
        </div>
      )}

      {/* EXPIRE */}
      {canExpire && (
        <button onClick={handleExpire} className="btn-ghost w-full py-2.5 text-[12px] text-red-600 border-red-200 hover:bg-red-50">Expire Stale Room</button>
      )}

      {/* TERMINAL */}
      {['Released', 'Refunded', 'Expired', 'Cancelled'].includes(room.state) && (
        <div className="text-stripe-body dark:text-gray-400 text-[13px] text-center py-2">This deal is closed.</div>
      )}
    </div>
  )
}

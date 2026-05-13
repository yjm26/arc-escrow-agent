function TimerBar({ label, value }) {
  return (
    <div className="flex items-center justify-between border border-stripe-border dark:border-white/10 rounded px-4 py-2.5 mb-5">
      <span className="text-[12px] text-stripe-body dark:text-gray-400 font-mono uppercase tracking-[1px]">{label}</span>
      <span className="text-[14px] font-mono font-medium text-stripe-navy dark:text-white">{value}</span>
    </div>
  )
}

export default function TimerSection({ room, countdowns }) {
  const { joinCountdown, fundCountdown, deliverCountdown, autoReleaseCountdown, disputeCountdown } = countdowns

  return (
    <>
      {room.state === 'Created' && joinCountdown && (
        <TimerBar label="Room expires" value={joinCountdown} />
      )}
      {room.state === 'Joined' && fundCountdown && (
        <TimerBar label="Fund deadline" value={fundCountdown} />
      )}
      {room.state === 'Funded' && deliverCountdown && (
        <TimerBar label="Deliver deadline" value={deliverCountdown} />
      )}
      {room.state === 'Delivered' && autoReleaseCountdown && (
        <TimerBar label="Auto-release" value={autoReleaseCountdown} />
      )}
      {room.state === 'Disputed' && disputeCountdown && (
        <TimerBar label="Arbiter deadline" value={disputeCountdown} />
      )}
    </>
  )
}

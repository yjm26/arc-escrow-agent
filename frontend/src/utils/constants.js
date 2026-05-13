export const STATE_BADGE = {
  Created: 'text-blue-700 bg-blue-50 border-blue-200',
  Joined: 'text-purple-700 bg-purple-50 border-purple-200',
  Funded: 'text-amber-700 bg-amber-50 border-amber-200',
  Delivered: 'text-green-700 bg-green-50 border-green-200',
  Released: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  Disputed: 'text-red-700 bg-red-50 border-red-200',
  Refunded: 'text-orange-700 bg-orange-50 border-orange-200',
  Expired: 'text-gray-600 bg-gray-50 border-gray-200',
  Cancelled: 'text-gray-600 bg-gray-50 border-gray-200',
}

export const TIMERS = {
  joinDeadline: 1 * 3600,       // 1h
  fundDeadline: 30 * 60,        // 30m
  deliverDeadline: 4 * 3600,    // 4h
  autoReleaseTime: 2 * 3600,    // 2h
  disputeTimeout: 6 * 3600,     // 6h
}

export function formatAddress(addr) {
  if (!addr || addr === '0x0000000000000000000000000000000000000000') return 'Waiting…'
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function formatCountdown(seconds) {
  if (seconds <= 0) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const rm = m % 60
    return `${h}h ${rm}m ${s}s`
  }
  return `${m}m ${s}s`
}

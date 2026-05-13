import { useState, useEffect } from 'react'
import { fetchReputation, getReputationBadge, getCollateralBadge } from '../utils/reputation'

export default function ReputationBadge({ provider, address, showDetails = false }) {
  const [rep, setRep] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!provider || !address) { setLoading(false); return }
    let cancelled = false
    fetchReputation(provider, address).then((data) => {
      if (!cancelled) { setRep(data); setLoading(false) }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [provider, address])

  if (loading || !rep || rep.totalDeals === 0) return null

  const badge = getReputationBadge(rep)
  const collBadge = getCollateralBadge(rep.multiplier)

  if (!showDetails) {
    return (
      <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border ${badge.color} font-medium`}>
        {badge.label} · {rep.successRate}%
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badge.color} font-medium`}>
          {badge.label}
        </span>
        <span className="text-[11px] text-gray-500">
          {rep.success} success · {rep.dispute} dispute · {rep.refunded} refunded · {rep.successRate}% rate
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${collBadge.color} font-medium`}>
          Collateral: {collBadge.label}
        </span>
        <span className="text-[10px] text-gray-400">{collBadge.desc}</span>
      </div>
    </div>
  )
}

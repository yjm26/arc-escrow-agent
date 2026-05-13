import { getContract } from './contract'

export async function fetchReputation(provider, address) {
  if (!address || address === '0x0000000000000000000000000000000000000000') return null
  try {
    const contract = getContract(provider)
    const [success, dispute, refunded, multiplier] = await Promise.all([
      contract.successCount(address),
      contract.disputeCount(address),
      contract.refundedCount(address),
      contract.collateralMultiplier(address),
    ])
    const total = Number(success) + Number(dispute) + Number(refunded)
    const successRate = total > 0 ? Math.round((Number(success) / total) * 100) : 0
    return {
      success: Number(success),
      dispute: Number(dispute),
      refunded: Number(refunded),
      multiplier: Number(multiplier),
      totalDeals: total,
      successRate,
    }
  } catch (err) {
    console.error('fetchReputation error:', err)
    return null
  }
}

export function getReputationBadge(rep) {
  if (!rep || rep.totalDeals === 0) return { label: 'New', color: 'bg-gray-100 text-gray-600 border-gray-200' }
  if (rep.successRate >= 95 && rep.totalDeals >= 10) return { label: 'Trusted', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (rep.successRate >= 90 && rep.totalDeals >= 5) return { label: 'Reliable', color: 'bg-blue-50 text-blue-700 border-blue-200' }
  if (rep.successRate >= 80) return { label: 'Good', color: 'bg-green-50 text-green-700 border-green-200' }
  if (rep.refunded > rep.success) return { label: 'Risky', color: 'bg-red-50 text-red-700 border-red-200' }
  if (rep.successRate >= 60) return { label: 'Fair', color: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label: 'Caution', color: 'bg-orange-50 text-orange-700 border-orange-200' }
}

export function getCollateralBadge(multiplier) {
  if (multiplier <= 50) return { label: '50%', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', desc: 'Low collateral (10+ deals)' }
  if (multiplier <= 75) return { label: '75%', color: 'bg-blue-50 text-blue-700 border-blue-200', desc: 'Reduced collateral (3+ deals)' }
  if (multiplier >= 150) return { label: '150%', color: 'bg-red-50 text-red-700 border-red-200', desc: 'High collateral (past refund)' }
  return { label: '100%', color: 'bg-gray-50 text-gray-600 border-gray-200', desc: 'Standard collateral' }
}

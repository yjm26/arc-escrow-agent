import { ethers } from 'ethers'
import { STATE_BADGE, formatAddress } from '../../utils/constants'

function PriceRow({ label, value, bold }) {
  return (
    <div className={`flex justify-between text-[13px] py-1.5 ${bold ? 'font-medium' : ''} border-b border-stripe-border dark:border-white/10 last:border-b-0`}>
      <span className="text-stripe-body dark:text-gray-400">{label}</span>
      <span className="text-stripe-navy dark:text-white font-mono" style={{ fontFeatureSettings: '"tnum"' }}>{value}</span>
    </div>
  )
}

function PartyRow({ address, role, isYou }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-stripe-border dark:border-white/10 last:border-b-0">
      <div>
        <span className="text-[13px] text-stripe-navy dark:text-white font-mono">{formatAddress(address)}</span>
        {isYou && <span className="ml-2 text-[10px] text-purple-600 font-medium">(you)</span>}
      </div>
      <span className="text-[12px] text-stripe-body dark:text-gray-400">{role}</span>
    </div>
  )
}

export default function InfoPanel({ room, id, account, priceUSDC, taxUSDC, totalUSDC }) {
  const isCreator = account === room.creator.toLowerCase()

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[18px] font-semibold text-stripe-navy dark:text-white mb-1">{room.item}</div>
          <div className="text-[13px] text-stripe-body dark:text-gray-400 font-mono">Room #{id}</div>
        </div>
        <span className={`px-2.5 py-1 rounded text-[11px] font-semibold tracking-wider border ${STATE_BADGE[room.state] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
          {room.state}
        </span>
      </div>

      {/* Price breakdown */}
      <div className="border border-stripe-border dark:border-white/10 rounded p-4 mb-5">
        <PriceRow label="Item price" value={`${priceUSDC} USDC`} />
        <PriceRow label="Tax (1%)" value={`${taxUSDC} USDC`} />
        <PriceRow label="Total to fund" value={`${totalUSDC} USDC`} bold />
        {Number(room.collateralAmount) > 0 && (
          <>
            <div className="border-t border-stripe-border dark:border-white/10 my-1" />
            <PriceRow label="Seller collateral" value={`${room.collateralAmount} USDC`} />
          </>
        )}
      </div>

      {/* In escrow */}
      {Number(room.value) > 0 && (
        <div className="bg-green-50 border border-green-200 rounded p-3 mb-5">
          <div className="text-[10px] font-mono uppercase tracking-[2px] text-green-600 mb-1">In Escrow</div>
          <div className="text-[18px] font-semibold text-green-700 font-mono">{room.value} USDC</div>
        </div>
      )}

      {/* Delivery proof hash */}
      {room.state === 'Delivered' && room.deliveryProofHash && room.deliveryProofHash !== ethers.ZeroHash && (
        <div className="border border-stripe-border dark:border-white/10 rounded p-3 mb-5">
          <div className="text-[10px] font-mono uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-1">Delivery Proof Hash</div>
          <div className="font-mono text-[11px] text-stripe-navy dark:text-white break-all">{room.deliveryProofHash}</div>
          <p className="text-[11px] text-stripe-body dark:text-gray-400 mt-1">Seller can verify the original proof off-chain</p>
        </div>
      )}

      {/* Parties */}
      <div className="border border-stripe-border dark:border-white/10 rounded p-4 mb-5">
        <div className="text-[10px] font-mono uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-3">Parties</div>
        <PartyRow address={room.creator} role={room.creatorIsSeller ? 'Seller' : 'Buyer'} isYou={isCreator} />
        {room.counterparty !== '0x0000000000000000000000000000000000000000' ? (
          <PartyRow address={room.counterparty} role={room.creatorIsSeller ? 'Buyer' : 'Seller'} isYou={!isCreator && account === room.counterparty.toLowerCase()} />
        ) : (
          <div className="text-[13px] text-stripe-body dark:text-gray-400 py-2">Waiting for counter party…</div>
        )}
        <div className="text-[13px] text-stripe-body dark:text-gray-400 py-2">
          You are: <span className="font-medium text-stripe-navy dark:text-white">{account === room.seller?.toLowerCase() ? 'Seller' : account === room.buyer?.toLowerCase() ? 'Buyer' : 'Viewer'}</span>
        </div>
      </div>
    </>
  )
}

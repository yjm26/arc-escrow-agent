import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { getContract, getUsdc, waitForTx, ARC_GAS, ARC_GAS_APPROVE, generateJoinCode, hashJoinCode, createInviteLink, CONTRACT_ADDRESS } from '../utils/contract'

const API_URL = import.meta.env.VITE_API_URL || 'https://arc-escrow-agent-production.up.railway.app'

export default function CreateRoom({ wallet }) {
  const [searchParams] = useSearchParams()
  const [item, setItem] = useState(searchParams.get('item') || '')
  const [price, setPrice] = useState(searchParams.get('price') || '')
  const [collateral, setCollateral] = useState(searchParams.get('collateral') || '')
  const [noCollateral, setNoCollateral] = useState(searchParams.get('collateral') === '0')
  const counterparty = searchParams.get('counterparty') || ''
  const fromMarket = !!searchParams.get('listingId') || !!searchParams.get('item')
  const [creatorIsSeller, setCreatorIsSeller] = useState(searchParams.get('creatorIsSeller') !== 'false')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    if (!wallet || !item || !price) return
    setLoading(true)
    setError('')
    setStep('Creating room…')
    try {
      const signer = await wallet.provider.getSigner()
      const contract = getContract(signer)
      const usdc = getUsdc(signer)
      const priceWei = ethers.parseUnits(price, 6)
      const collateralValue = noCollateral ? '0' : collateral
      const collateralWei = collateralValue ? ethers.parseUnits(collateralValue, 6) : 0n
      const joinCode = generateJoinCode()
      const joinCodeHash = hashJoinCode(joinCode)

      // Step 1: Approve USDC for collateral (if needed)
      if (collateralWei > 0n) {
        setStep('Approving USDC…')
        try {
          const approveTx = await usdc.approve(CONTRACT_ADDRESS, collateralWei, ARC_GAS_APPROVE)
          console.log('approve tx:', approveTx.hash)
          await waitForTx(wallet.provider, approveTx.hash, 30000)
        } catch (approveErr) {
          console.error('approve failed:', approveErr)
          throw new Error('USDC approve failed: ' + (approveErr.message || 'unknown'))
        }
      }

      // Step 2: Create room (contract pulls collateral via transferFrom)
      setStep('Creating room…')
      const tx = await contract.createRoom(item, priceWei, collateralWei, joinCodeHash, creatorIsSeller, ARC_GAS)
      console.log('createRoom tx:', tx.hash)
      setStep('Waiting for confirmation…')
      const receipt = await waitForTx(wallet.provider, tx.hash, 60000)

      const event = receipt.logs.find(log => {
        try { return contract.interface.parseLog(log)?.name === 'RoomCreated' } catch { return false }
      })
      const parsed = contract.interface.parseLog(event)
      const roomId = parsed.args.roomId.toString()
      const inviteLink = createInviteLink(roomId, joinCode)

      setResult({ roomId, inviteLink, joinCode })
      setStep('')

          // Mark listing as taken (if from market)
      const listingId = searchParams.get('listingId')
      if (listingId) {
        try {
          await fetch(`${API_URL}/api/listings/${listingId}/taken`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, creator: wallet.address }),
          })
        } catch (e) { console.error('Mark taken:', e) }
      }

      // Auto-post join code to backend so counterparty can auto-join
      if (counterparty) {
        try {
          console.log('Posting room code:', { roomId, joinCode, creator: wallet.address, counterparty })
          const resp = await fetch(`${API_URL}/api/room-codes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomId,
              joinCode,
              creator: wallet.address,
              counterparty,
              item,
              price,
            }),
          })
          const respData = await resp.json()
          console.log('Room code post response:', respData)
        } catch (e) { console.error('Failed to post room code:', e) }
      }
    } catch (err) {
      console.error(err)
      setError(err.reason || err.message || 'Transaction failed')
      setStep('')
    } finally {
      setLoading(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(result.inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (result) {
    return (
      <section className="pt-28 pb-32 px-4 sm:px-6 min-h-screen">
        <div className="max-w-full sm:max-w-[560px] mx-auto">
          <div className="card-3d p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h2 className="text-[22px] font-semibold text-stripe-navy dark:text-white mb-1">Room Created!</h2>
              <p className="text-[14px] text-stripe-body dark:text-gray-400">Share this invite link with your counterparty</p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-1">Room ID</div>
                <div className="text-stripe-navy dark:text-white font-mono text-[16px] font-semibold">#{result.roomId}</div>
              </div>

              <div>
                <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-1.5">Join Code</div>
                <div className="bg-stripe-surface dark:bg-white/5 border border-stripe-border dark:border-white/10 rounded-lg px-4 py-3">
                  <code className="text-green-600 font-mono text-[20px] tracking-[4px] font-bold">{result.joinCode}</code>
                </div>
              </div>

              <div>
                <div className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400 mb-1.5">Invite Link</div>
                <div className="flex gap-2">
                  <input readOnly value={result.inviteLink} className="stripe-input flex-1 font-mono text-[12px]" />
                  <button onClick={copyLink} className="btn-primary px-4 text-[13px]">
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-[11px] text-stripe-body dark:text-gray-400 mt-1.5">⚠️ Only share with your counterparty</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Link to={`/room/${result.roomId}?code=${result.joinCode}`} className="btn-primary flex-1 text-center py-3">
                Go to Room →
              </Link>
              <Link to="/rooms" className="btn-secondary px-4 py-3">
                My Rooms
              </Link>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="pt-28 pb-32 px-4 sm:px-6 min-h-screen">
      <div className="max-w-full sm:max-w-[560px] mx-auto">
        <div className="font-mono text-[11px] uppercase tracking-[3px] text-stripe-body dark:text-gray-400 mb-4">Create Room</div>
        <h2 className="text-[32px] font-light text-stripe-navy dark:text-white mb-1" style={{ letterSpacing: '-0.64px' }}>
          {fromMarket ? 'Confirm the deal' : 'Set up a trustless deal'}
        </h2>
        <p className="text-[15px] font-light text-stripe-body dark:text-gray-400 mb-8">
          {fromMarket ? 'Deal terms are locked from the market listing.' : 'Free to create. 1% fee only when funded.'}
        </p>

        <div className="card-3d p-6">
          {/* Role toggle */}
          <div className="mb-5">
            <label className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-500 block mb-2">I am</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => !fromMarket && setCreatorIsSeller(true)}
                disabled={fromMarket}
                className={`flex-1 py-2.5 rounded-md text-[13px] font-mono border transition ${
                  creatorIsSeller
                    ? 'bg-zinc-900 dark:bg-white text-zinc-100 dark:text-[#0c0f1a] border-zinc-700 dark:border-white'
                    : 'bg-white dark:bg-white/5 text-zinc-500 dark:text-gray-400 border-zinc-200 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/20'
                } ${fromMarket ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                ◆ SELLER — I deliver the item
              </button>
              <button
                type="button"
                onClick={() => { if (!fromMarket) { setCreatorIsSeller(false); setNoCollateral(true); setCollateral('') } }}
                disabled={fromMarket}
                className={`flex-1 py-2.5 rounded-md text-[13px] font-mono border transition ${
                  !creatorIsSeller
                    ? 'bg-zinc-900 dark:bg-white text-zinc-100 dark:text-[#0c0f1a] border-zinc-700 dark:border-white'
                    : 'bg-white dark:bg-white/5 text-zinc-500 dark:text-gray-400 border-zinc-200 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/20'
                } ${fromMarket ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                ◈ BUYER — I fund the escrow
              </button>
            </div>
          </div>

          {/* Role indicator + flow */}
          <div className="mb-5 p-4 rounded-lg bg-stripe-surface dark:bg-white/5 border border-stripe-border dark:border-white/10">
            <div className="text-[11px] text-stripe-body dark:text-gray-400 font-mono mb-3">
              {creatorIsSeller
                ? '◆ You are the SELLER — you deliver the item'
                : '◈ You are the BUYER — you fund the escrow'}
            </div>
            <div className="flex items-start gap-3 text-[11px]">
              {creatorIsSeller ? (
                <>
                  <div className="flex-1 text-center">
                    <div className="w-6 h-6 mx-auto rounded-full bg-stripe-navy dark:bg-white text-white dark:text-[#0c0f1a] flex items-center justify-center text-[10px] font-bold mb-1">1</div>
                    <div className="text-stripe-navy dark:text-white font-medium">You create</div>
                    <div className="text-stripe-body dark:text-gray-500 mt-0.5">+ collateral locked now</div>
                  </div>
                  <div className="text-stripe-border dark:text-white/10 mt-2">→</div>
                  <div className="flex-1 text-center">
                    <div className="w-6 h-6 mx-auto rounded-full border border-stripe-border dark:border-white/20 text-stripe-body dark:text-gray-500 flex items-center justify-center text-[10px] font-bold mb-1">2</div>
                    <div className="text-stripe-navy dark:text-white font-medium">Buyer joins</div>
                    <div className="text-stripe-body dark:text-gray-500 mt-0.5">no cost</div>
                  </div>
                  <div className="text-stripe-border dark:text-white/10 mt-2">→</div>
                  <div className="flex-1 text-center">
                    <div className="w-6 h-6 mx-auto rounded-full border border-stripe-border dark:border-white/20 text-stripe-body dark:text-gray-500 flex items-center justify-center text-[10px] font-bold mb-1">3</div>
                    <div className="text-stripe-navy dark:text-white font-medium">Buyer funds</div>
                    <div className="text-stripe-body dark:text-gray-500 mt-0.5">price + 1% fee</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 text-center">
                    <div className="w-6 h-6 mx-auto rounded-full bg-stripe-navy dark:bg-white text-white dark:text-[#0c0f1a] flex items-center justify-center text-[10px] font-bold mb-1">1</div>
                    <div className="text-stripe-navy dark:text-white font-medium">You create</div>
                    <div className="text-stripe-body dark:text-gray-500 mt-0.5">no cost</div>
                  </div>
                  <div className="text-stripe-border dark:text-white/10 mt-2">→</div>
                  <div className="flex-1 text-center">
                    <div className="w-6 h-6 mx-auto rounded-full border border-stripe-border dark:border-white/20 text-stripe-body dark:text-gray-500 flex items-center justify-center text-[10px] font-bold mb-1">2</div>
                    <div className="text-stripe-navy dark:text-white font-medium">Seller joins</div>
                    <div className="text-stripe-body dark:text-gray-500 mt-0.5">no cost</div>
                  </div>
                  <div className="text-stripe-border dark:text-white/10 mt-2">→</div>
                  <div className="flex-1 text-center">
                    <div className="w-6 h-6 mx-auto rounded-full border border-stripe-border dark:border-white/20 text-stripe-body dark:text-gray-500 flex items-center justify-center text-[10px] font-bold mb-1">3</div>
                    <div className="text-stripe-navy dark:text-white font-medium">You fund</div>
                    <div className="text-stripe-body dark:text-gray-500 mt-0.5">price + 1% fee</div>
                  </div>
                </>
              )}
            </div>
          </div>

          <input
            className="stripe-input mb-3"
            placeholder="What are you selling?"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            readOnly={fromMarket}
            maxLength={500}
          />

          <div className="relative mb-3">
            <input
              className="stripe-input"
              type="number"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              readOnly={fromMarket}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-stripe-body dark:text-gray-400 font-medium">USDC</span>
          </div>

          {/* Collateral section — only for sellers */}
          {creatorIsSeller && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-mono text-[10px] uppercase tracking-[2px] text-stripe-body dark:text-gray-400">
                  Collateral
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noCollateral}
                    onChange={(e) => {
                      setNoCollateral(e.target.checked)
                      if (e.target.checked) setCollateral('')
                    }}
                    className="w-3.5 h-3.5 rounded border-stripe-border dark:border-white/20 accent-stripe-navy"
                  />
                  <span className="text-[11px] text-stripe-body dark:text-gray-400">No collateral</span>
                </label>
              </div>
              {!noCollateral && (
                <>
                  <div className="relative">
                    <input
                      className="stripe-input"
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={collateral}
                      onChange={(e) => !fromMarket && setCollateral(e.target.value)}
                      readOnly={fromMarket}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-stripe-body dark:text-gray-400 font-medium">USDC</span>
                  </div>
                  <p className="text-[11px] text-stripe-body dark:text-gray-400 mt-1">
                    Your "skin in the game." Lost if you scam.
                  </p>
                </>
              )}
              {noCollateral && (
                <p className="text-[11px] text-stripe-body dark:text-gray-400 mt-1">
                  No collateral — buyer trusts you based on reputation only.
                </p>
              )}
            </div>
          )}



          <button onClick={handleCreate} disabled={loading || !item || !price} className="btn-primary w-full py-3.5 text-[15px]">
            {loading ? step || 'Processing…' : fromMarket ? `Confirm Deal →` : `Create Room (FREE${!noCollateral && collateral && creatorIsSeller ? ' + collateral' : ''})`}
          </button>

          {error && (
            <div className="mt-3 px-4 py-2.5 rounded text-[13px] font-medium border bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20">
              {error}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

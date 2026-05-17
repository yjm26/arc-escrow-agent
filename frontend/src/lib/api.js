import { ethers } from 'ethers'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * Build SIWE-like message matching server's expected format.
 */
function buildMessage(address, nonce) {
  return `bond.arc.network wants you to sign in with your Ethereum account:\n${address}\n\nNonce: ${nonce}`
}

/**
 * Auth cache to avoid re-signing on every request.
 * Nonces expire after 5 min on server, cache for 4 min.
 */
let authCache = { address: null, nonce: null, signature: null, expires: 0 }

/**
 * Reset auth cache on disconnect or wallet switch.
 */
export function resetAuthCache() {
  authCache = { address: null, nonce: null, signature: null, expires: 0 }
}

/**
 * Get auth headers — fetches nonce + signs with wallet signer.
 * Caches result for 4 minutes to avoid repeated signing prompts.
 */
export async function getAuthHeaders(wallet) {
  if (!wallet?.address || !wallet?.signer) throw new Error('Wallet not connected')

  const now = Date.now()
  if (authCache.address === wallet.address && authCache.expires > now) {
    return {
      'X-Wallet-Address': wallet.address,
      'X-Signature': authCache.signature,
      'X-Nonce': authCache.nonce,
    }
  }

  // Fetch fresh nonce
  const nonceRes = await fetch(`${API_URL}/api/auth/nonce?address=${wallet.address}`)
  if (!nonceRes.ok) throw new Error('Failed to get auth nonce')
  const { nonce } = await nonceRes.json()

  // Sign with wallet
  const msg = buildMessage(wallet.address, nonce)
  const signature = await wallet.signer.signMessage(msg)

  authCache = { address: wallet.address, nonce, signature, expires: now + 4 * 60 * 1000 }

  return {
    'X-Wallet-Address': wallet.address,
    'X-Signature': signature,
    'X-Nonce': nonce,
  }
}

/**
 * Authenticated fetch — auto-attaches wallet auth headers.
 * Usage: await authFetch('/api/listings', { method: 'POST', body: ... }, wallet)
 */
export async function authFetch(path, options = {}, wallet) {
  const authHeaders = await getAuthHeaders(wallet)

  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  })

  // Retry once if auth failed (e.g., nonce expired)
  if (res.status === 401 && !options._retry) {
    const freshHeaders = await getAuthHeaders(wallet)
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      _retry: true,
      headers: {
        'Content-Type': 'application/json',
        ...freshHeaders,
        ...options.headers,
      },
    })
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error ${res.status}`)
  }

  if (res.status === 204) return null
  return res.json()
}

/**
 * Simple GET (no auth needed).
 */
export async function apiGet(path) {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`)
  return res.json()
}

export { API_URL }

import { ethers } from 'ethers'
import { BONDROOM_ADDRESS, BONDROOM_ABI, ARC_TESTNET } from './contract'

// Reconnect with optional Reown provider, fallback to window.ethereum
export async function reconnectWallet(reownProvider) {
  const provider = reownProvider
    ? new ethers.BrowserProvider(reownProvider)
    : new ethers.BrowserProvider(window.ethereum)

  const signer = await provider.getSigner()
  const address = await signer.getAddress()

  let balance = 0n
  try { balance = await provider.getBalance(address) } catch {}

  const contract = new ethers.Contract(BONDROOM_ADDRESS, BONDROOM_ABI, signer)

  return { provider, signer, address, balance, contract }
}

export function formatAddress(addr) {
  if (!addr) return ''
  return addr.slice(0, 6) + '…' + addr.slice(-4)
}

export function formatBalance(bal) {
  return parseFloat(ethers.formatEther(bal)).toFixed(2)
}

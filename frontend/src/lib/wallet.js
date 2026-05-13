import { ethers } from 'ethers'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../utils/contract'

const ARC_TESTNET = {
  chainId: 5042002,
  hex: '0x4cef52',
  name: 'Arc Testnet',
  rpcUrl: 'https://rpc.testnet.arc.network',
  explorer: 'https://testnet.arcscan.app',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
}

// Silent reconnect — no popup, uses already-authorized account
export async function reconnectWallet(reownProvider) {
  const ethereum = reownProvider || window.ethereum
  if (!ethereum) throw new Error('No wallet detected')
  const provider = new ethers.BrowserProvider(ethereum)
  const accounts = await provider.send('eth_accounts', [])
  if (accounts.length === 0) throw new Error('No connected account')
  const signer = await provider.getSigner()
  const address = await signer.getAddress()
  let balance = 0n
  try { balance = await provider.getBalance(address) } catch {}
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
  return { provider, signer, address, balance, contract }
}

export function formatAddress(addr) {
  if (!addr) return ''
  return addr.slice(0, 6) + '…' + addr.slice(-4)
}

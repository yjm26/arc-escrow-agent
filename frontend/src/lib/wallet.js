import { ethers } from 'ethers'
import { ARC_TESTNET, BONDROOM_ADDRESS, USDC_ADDRESS, BONDROOM_ABI, ERC20_ABI } from './contract'

export async function connectWallet() {
  if (!window.ethereum) throw new Error('No wallet detected')

  // ─── Step 1: Add Arc Testnet chain (idempotent, safe if already exists) ───
  const chainParams = {
    chainId: ARC_TESTNET.hex,
    chainName: ARC_TESTNET.name,
    rpcUrls: [ARC_TESTNET.rpcUrl],
    nativeCurrency: ARC_TESTNET.nativeCurrency,
    blockExplorerUrls: [ARC_TESTNET.explorer],
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [chainParams],
    })
  } catch (e) {
    // 4902 = chain not added yet (expected on first connect)
    // 4001 = user rejected (rethrow)
    // -32603 = already added (ignore)
    if (e.code === 4001) throw new Error('User rejected chain add')
    // Other errors are fine (chain might already exist)
  }

  // ─── Step 2: Switch to Arc Testnet ───
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ARC_TESTNET.hex }],
    })
  } catch (e) {
    // 4001 = user rejected
    if (e.code === 4001) throw new Error('User rejected chain switch')
    // Other errors might mean chain not found, try adding again
    if (e.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [chainParams],
      })
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARC_TESTNET.hex }],
      })
    }
  }

  // ─── Step 3: Request accounts ───
  const provider = new ethers.BrowserProvider(window.ethereum)
  await provider.send('eth_requestAccounts', [])
  const signer = await provider.getSigner()

  // ─── Step 4: Verify we're on the right chain ───
  const network = await provider.getNetwork()
  if (network.chainId !== BigInt(ARC_TESTNET.chainId)) {
    throw new Error(`Wrong chain! Expected Arc Testnet (${ARC_TESTNET.chainId}), got ${network.chainId}`)
  }

  const address = await signer.getAddress()
  const balance = await provider.getBalance(address)
  const room = new ethers.Contract(BONDROOM_ADDRESS, BONDROOM_ABI, signer)
  const token = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer)

  return { provider, signer, address, balance, room, token }
}

export function formatAddress(addr) {
  return addr.slice(0, 6) + '…' + addr.slice(-4)
}

export function formatBalance(bal) {
  return parseFloat(ethers.formatEther(bal)).toFixed(2)
}

export function formatUSDC(amount) {
  return ethers.formatUnits(amount, 6)
}

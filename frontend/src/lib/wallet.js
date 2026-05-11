import { ethers } from 'ethers'
import { ARC_TESTNET, ESCROW_ADDRESS, USDC_ADDRESS, ESCROW_ABI, ERC20_ABI } from './contract'

export async function connectWallet() {
  if (!window.ethereum) throw new Error('No wallet detected')

  const provider = new ethers.BrowserProvider(window.ethereum)
  await provider.send('eth_requestAccounts', [])
  const signer = await provider.getSigner()

  // Switch to Arc Testnet
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ARC_TESTNET.hex }],
    })
  } catch (e) {
    if (e.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: ARC_TESTNET.hex,
          chainName: ARC_TESTNET.name,
          rpcUrls: [ARC_TESTNET.rpcUrl],
          nativeCurrency: ARC_TESTNET.nativeCurrency,
          blockExplorerUrls: [ARC_TESTNET.explorer],
        }],
      })
    }
  }

  const address = await signer.getAddress()
  const balance = await provider.getBalance(address)
  const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer)
  const token = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer)

  return { provider, signer, address, balance, escrow, token }
}

export function formatAddress(addr) {
  return addr.slice(0, 6) + '…' + addr.slice(-4)
}

export function formatBalance(bal) {
  return parseFloat(ethers.formatEther(bal)).toFixed(2)
}

import { createAppKit } from '@reown/appkit'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'

const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
  blockExplorers: { default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' } },
  testnet: true,
}

const metadata = {
  name: 'BOND',
  description: 'Trustless USDC escrow on Arc Network',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://bond.app',
  icons: ['https://avatars.githubusercontent.com/u/179229932'],
}

const ethersAdapter = new EthersAdapter()

export const appKit = createAppKit({
  projectId: 'af815ce51d40ec33de9699ee550f21a8',
  adapters: [ethersAdapter],
  networks: [ARC_TESTNET],
  metadata,
  features: { analytics: false },
})

export { ARC_TESTNET }

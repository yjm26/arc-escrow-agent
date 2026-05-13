import { useState, useCallback, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { createAppKit } from '@reown/appkit/react'
import { useAppKit, useAppKitAccount, useAppKitProvider, useDisconnect } from '@reown/appkit/react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import Navbar from './components/Navbar'
import ErrorBoundary from './components/ErrorBoundary'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import RoomsPage from './components/RoomsPage'
import RoomView from './components/RoomView'
import CreateRoom from './components/CreateRoom'
import Market from './components/Market'
import Offers from './components/Offers'
import Docs from './components/Docs'
import { reconnectWallet } from './lib/wallet'

const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
  blockExplorers: { default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' } },
  testnet: true,
}

createAppKit({
  projectId: 'af815ce51d40ec33de9699ee550f21a8',
  adapters: [new EthersAdapter()],
  networks: [ARC_TESTNET],
  metadata: {
    name: 'BOND',
    description: 'Trustless USDC escrow on Arc Network',
    url: typeof window !== 'undefined' ? window.location.origin : '',
    icons: ['https://avatars.githubusercontent.com/u/179229932'],
  },
  features: { analytics: false },
})

export default function App() {
  const { address, isConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider('eip155')
  const { open: openAppKit } = useAppKit()
  const { disconnect } = useDisconnect()

  const [wallet, setWallet] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState(null)
  const manualDisconnect = useRef(false)

  useEffect(() => {
    if (!isConnected || !address) {
      setWallet(null)
      return
    }
    if (manualDisconnect.current) {
      manualDisconnect.current = false
      return
    }
    let cancelled = false
    ;(async () => {
      setConnecting(true)
      setConnectError(null)
      try {
        const w = await reconnectWallet(walletProvider)
        if (!cancelled) {
          setWallet(w)
          localStorage.setItem('bond_wallet_connected', '1')
        }
      } catch (e) {
        console.error('Wallet build failed:', e)
        if (!cancelled) setConnectError(e.message)
      } finally {
        if (!cancelled) setConnecting(false)
      }
    })()
    return () => { cancelled = true }
  }, [isConnected, address, walletProvider])

  const handleConnect = useCallback(() => openAppKit(), [openAppKit])

  const handleDisconnect = useCallback(async () => {
    manualDisconnect.current = true
    setWallet(null)
    localStorage.removeItem('bond_wallet_connected')
    try { await disconnect() } catch (e) { console.error('Disconnect failed:', e) }
  }, [disconnect])

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Navbar onConnect={handleConnect} onDisconnect={handleDisconnect} wallet={wallet} connecting={connecting} />
      <ErrorBoundary>
      <Routes>
        <Route path="/" element={<><Hero wallet={wallet} onConnect={handleConnect} /><HowItWorks /></>} />
        <Route path="/create" element={<CreateRoom wallet={wallet} />} />
        <Route path="/rooms" element={<RoomsPage wallet={wallet} />} />
        <Route path="/room/:id" element={<RoomView wallet={wallet} />} />
        <Route path="/docs/:section?" element={<Docs />} />
        <Route path="/market" element={<Market wallet={wallet} />} />
        <Route path="/offers" element={<Offers wallet={wallet} />} />
      </Routes>
      </ErrorBoundary>
      <div className="max-w-[600px] mx-auto px-6 mb-16">
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-5 py-3 text-center text-[13px] text-amber-800 dark:text-amber-400 font-medium">
          Arc Testnet — for testing only, not real money
        </div>
      </div>
      <footer className="py-16 text-center border-t border-stripe-border dark:border-white/10">
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <div className="w-5 h-5 bg-stripe-navy dark:bg-white rounded flex items-center justify-center">
            <span className="text-white dark:text-[#0c0f1a] text-[8px] font-bold font-mono">B</span>
          </div>
          <span className="text-[13px] font-medium text-stripe-navy dark:text-white">BOND</span>
        </div>
        <div className="text-[12px] font-light text-stripe-body dark:text-gray-500">on Arc Testnet</div>
        <div className="flex items-center justify-center gap-4 mt-3">
          <a href="https://testnet.arcscan.app/address/0x7630A99188C5B4199c8ABd06b9462A6eC502AC2C" target="_blank" rel="noopener" className="text-[11px] text-stripe-body dark:text-gray-500 hover:text-stripe-navy dark:hover:text-white transition">Contract</a>
          <span className="text-stripe-border dark:text-white/10">·</span>
          <a href="https://github.com/yjm26/arc-escrow-agent" target="_blank" rel="noopener" className="text-[11px] text-stripe-body dark:text-gray-500 hover:text-stripe-navy dark:hover:text-white transition">GitHub</a>
        </div>
        <div className="font-mono text-[10px] text-gray-400 dark:text-gray-600 mt-2">0x7630A99188C5B4199c8ABd06b9462A6eC502AC2C</div>
      </footer>
    </BrowserRouter>
  )
}

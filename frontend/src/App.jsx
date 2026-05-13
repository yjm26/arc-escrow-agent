import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { createAppKit } from '@reown/appkit'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { useAppKitAccount, useAppKitProvider, useAppKit } from '@reown/appkit/react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import RoomsPage from './components/RoomsPage'
import RoomView from './components/app/RoomView'
import CreateRoom from './components/app/CreateRoom'
import ConnectWallet from './components/app/ConnectWallet'
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

  const [wallet, setWallet] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState(null)

  useEffect(() => {
    if (!isConnected || !address) { setWallet(null); return }
    let cancelled = false
    ;(async () => {
      setConnecting(true)
      setConnectError(null)
      try {
        const w = await reconnectWallet(walletProvider)
        if (!cancelled) setWallet(w)
      } catch (e) {
        if (!cancelled) setConnectError(e.message)
      } finally {
        if (!cancelled) setConnecting(false)
      }
    })()
    return () => { cancelled = true }
  }, [isConnected, address, walletProvider])

  return (
    <BrowserRouter>
      <Navbar wallet={wallet} connecting={connecting} onConnect={openAppKit} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={
          <CreatePage wallet={wallet} connecting={connecting} connectError={connectError} onConnect={openAppKit} />
        } />
        <Route path="/rooms" element={
          <RoomsPage wallet={wallet} connecting={connecting} connectError={connectError} onConnect={openAppKit} />
        } />
        <Route path="/room/:id" element={
          <RoomPage wallet={wallet} connecting={connecting} connectError={connectError} onConnect={openAppKit} />
        } />
      </Routes>
      <footer className="py-16 text-center border-t border-stripe-border">
        <p className="text-[13px] text-stripe-body">Built on Arc Testnet</p>
      </footer>
    </BrowserRouter>
  )
}

function HomePage() {
  return (<><Hero /><HowItWorks /><Features /></>)
}

function CreatePage({ wallet, connecting, connectError, onConnect }) {
  return (
    <section className="pt-28 pb-32 px-6 min-h-screen">
      <div className="max-w-[480px] mx-auto">
        {!wallet
          ? <ConnectWallet onConnect={onConnect} loading={connecting} error={connectError} />
          : <CreateRoom room={wallet.contract} token={null} signerAddress={wallet.address} />
        }
      </div>
    </section>
  )
}

function RoomPage({ wallet, connecting, connectError, onConnect }) {
  return (
    <section className="pt-28 pb-32 px-6 min-h-screen">
      <div className="max-w-[600px] mx-auto">
        {!wallet
          ? <ConnectWallet onConnect={onConnect} loading={connecting} error={connectError} />
          : <RoomView wallet={wallet} />
        }
      </div>
    </section>
  )
}

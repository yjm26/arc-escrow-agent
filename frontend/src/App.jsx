import { useState, useCallback, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
import { connectWallet, reconnectWallet } from './lib/wallet'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './utils/contract'
import { ethers } from 'ethers'

export default function App() {
  const [wallet, setWallet] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState(null)

  // Auto-reconnect on mount if wallet was previously connected
  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return
    const wasConnected = localStorage.getItem('bond_wallet_connected')
    if (!wasConnected) return
    ;(async () => {
      try {
        const w = await reconnectWallet()
        setWallet(w)
      } catch {
        localStorage.removeItem('bond_wallet_connected')
      }
    })()
  }, [])

  // Poll eth_accounts — aggressive first 10s (every 1s), then every 5s
  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return
    let active = true
    let count = 0

    const check = async () => {
      if (!active || wallet) return
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0 && active && !wallet) {
          const provider = new ethers.BrowserProvider(window.ethereum)
          const signer = await provider.getSigner()
          const address = await signer.getAddress()
          let balance = 0n
          try { balance = await provider.getBalance(address) } catch {}
          const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
          if (active) {
            setWallet({ provider, signer, address, balance, contract })
            localStorage.setItem('bond_wallet_connected', '1')
          }
        }
      } catch {}
      count++
    }

    // Start checking after 500ms (let MetaMask inject)
    const startTimer = setTimeout(() => {
      if (!active) return
      check()
      const fastInterval = setInterval(() => { if (count < 10 && !wallet) check() }, 1000)
      const slowInterval = setInterval(() => { if (count >= 10 && !wallet) check() }, 5000)
      // Store refs for cleanup
      check._fastInterval = fastInterval
      check._slowInterval = slowInterval
    }, 500)

    return () => {
      active = false
      clearTimeout(startTimer)
      if (check._fastInterval) clearInterval(check._fastInterval)
      if (check._slowInterval) clearInterval(check._slowInterval)
    }
  }, [wallet])

  // Listen for wallet disconnect
  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setWallet(null)
        localStorage.removeItem('bond_wallet_connected')
      } else if (wallet && accounts[0].toLowerCase() !== wallet.address.toLowerCase()) {
        // Account switched — reconnect
        setWallet(null)
        handleConnect()
      }
    }
    window.ethereum.on('accountsChanged', handleAccountsChanged)
    return () => window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
  }, [wallet])

  const handleDisconnect = useCallback(() => {
    setWallet(null)
    localStorage.removeItem('bond_wallet_connected')
  }, [])

  const handleConnect = useCallback(async () => {
    setConnecting(true)
    setConnectError(null)
    try {
      // Check if already authorized (no popup needed)
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.send('eth_accounts', [])
        if (accounts.length > 0) {
          // Already connected — rebuild state silently
          const w = await reconnectWallet()
          setWallet(w)
          localStorage.setItem('bond_wallet_connected', '1')
          setConnecting(false)
          return
        }
      }
      // First time — trigger popup
      const w = await connectWallet()
      setWallet(w)
      localStorage.setItem('bond_wallet_connected', '1')
    } catch (e) {
      setConnectError(e.message)
    } finally {
      setConnecting(false)
    }
  }, [])

  return (
    <BrowserRouter>
      <Navbar onConnect={handleConnect} onDisconnect={handleDisconnect} wallet={wallet} connecting={connecting} />
      <ErrorBoundary>
      <Routes>
        <Route path="/" element={<><Hero wallet={wallet} onConnect={handleConnect} /><HowItWorks /></>} />
        <Route
          path="/create"
          element={
            <CreateRoom wallet={wallet} />
          }
        />
        <Route
          path="/rooms"
          element={
            <RoomsPage wallet={wallet} />
          }
        />
        <Route
          path="/room/:id"
          element={
            <RoomView wallet={wallet} />
          }
        />
        <Route path="/docs/:section?" element={<Docs />} />
        <Route path="/market" element={<Market wallet={wallet} />} />
        <Route path="/offers" element={<Offers wallet={wallet} />} />
        
      </Routes>
      </ErrorBoundary>

      {/* Disclaimer */}
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
        <div className="font-mono text-[10px] text-gray-400 dark:text-gray-600 mt-2">0x59Ab8013D4e65d938Ab83b235956e1881046BfB4</div>
      </footer>
    </BrowserRouter>
  )
}


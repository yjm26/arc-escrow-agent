import { useState, useCallback } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import ConnectWallet from './components/app/ConnectWallet'
import CreateDeal from './components/app/CreateDeal'
import ManageDeal from './components/app/ManageDeal'
import { connectWallet, formatAddress, formatBalance } from './lib/wallet'

export default function App() {
  const [wallet, setWallet] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState(null)
  const [lastDealId, setLastDealId] = useState(null)

  const handleConnect = useCallback(async () => {
    setConnecting(true)
    setConnectError(null)
    try {
      const w = await connectWallet()
      setWallet(w)
    } catch (e) {
      setConnectError(e.message)
    } finally {
      setConnecting(false)
    }
  }, [])

  const scrollToApp = () => {
    document.getElementById('app')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleDealCreated = (id) => {
    setLastDealId(id)
  }

  return (
    <>
      <Navbar onLaunch={scrollToApp} />
      <Hero onOpenApp={scrollToApp} />
      <Features />
      <HowItWorks />

      {/* App Section */}
      <section id="app" className="py-25 px-6 bg-fg text-bg">
        <div className="max-w-[560px] mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[3px] text-[#666] mb-4">
            App
          </div>
          <h2 className="text-[32px] font-bold tracking-tight mb-8">
            Start an escrow.
          </h2>

          {!wallet ? (
            <ConnectWallet onConnect={handleConnect} loading={connecting} error={connectError} />
          ) : (
            <div className="flex flex-col gap-3">
              {/* Wallet Bar */}
              <div className="flex justify-between items-center px-4 py-3 bg-dark border border-dark-border rounded-xl">
                <span className="text-accent text-sm font-semibold">
                  {formatAddress(wallet.address)}
                </span>
                <span className="text-[#555] text-xs">
                  {formatBalance(wallet.balance)} USDC
                </span>
              </div>

              <CreateDeal escrow={wallet.escrow} onCreated={handleDealCreated} />

              <ManageDeal
                escrow={wallet.escrow}
                token={wallet.token}
                signerAddress={wallet.address}
              />
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-xs text-muted border-t border-border">
        BOND on Arc Testnet ·{' '}
        <a
          href="https://testnet.arcscan.app/address/0xd6f0548Db78d50B210493ED545f4Cd1341C20c0B"
          target="_blank"
          rel="noopener"
          className="hover:text-fg transition-colors"
        >
          Contract
        </a>{' '}
        ·{' '}
        <a
          href="https://github.com/yjm26/arc-escrow-agent"
          target="_blank"
          rel="noopener"
          className="hover:text-fg transition-colors"
        >
          GitHub
        </a>
      </footer>
    </>
  )
}

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
      <section id="app" className="py-24 px-6">
        <div className="max-w-[560px] mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[3px] text-stripe-body mb-4">
            App
          </div>
          <h2
            className="text-[32px] font-light text-stripe-navy mb-3"
            style={{ letterSpacing: '-0.64px', fontFeatureSettings: '"ss01"' }}
          >
            Start an escrow.
          </h2>
          <p className="text-[15px] font-light text-stripe-body mb-10 leading-[1.5]">
            Connect your wallet to create, fund, and manage trustless deals on Arc.
          </p>

          {!wallet ? (
            <ConnectWallet onConnect={handleConnect} loading={connecting} error={connectError} />
          ) : (
            <div className="flex flex-col gap-5">
              {/* Wallet Bar */}
              <div
                className="flex justify-between items-center px-5 py-3.5 bg-white border border-stripe-border rounded"
                style={{ boxShadow: 'rgba(50,50,93,0.15) 0px 10px 25px -10px, rgba(0,0,0,0.06) 0px 6px 12px -6px' }}
              >
                <span className="text-stripe-purple text-[13px] font-medium font-mono">
                  {formatAddress(wallet.address)}
                </span>
                <span className="text-stripe-body text-[13px]" style={{ fontFeatureSettings: '"tnum"' }}>
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
      <footer className="py-12 text-center border-t border-stripe-border">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-5 h-5 bg-stripe-navy rounded flex items-center justify-center">
            <span className="text-white text-[8px] font-bold font-mono">B</span>
          </div>
          <span className="text-[13px] font-medium text-stripe-navy">BOND</span>
        </div>
        <div className="text-[12px] font-light text-stripe-body">
          on Arc Testnet ·{' '}
          <a
            href="https://testnet.arcscan.app/address/0xd6f0548Db78d50B210493ED545f4Cd1341C20c0B"
            target="_blank"
            rel="noopener"
            className="text-stripe-purple hover:underline"
          >
            Contract
          </a>
          {' · '}
          <a
            href="https://github.com/yjm26/arc-escrow-agent"
            target="_blank"
            rel="noopener"
            className="text-stripe-purple hover:underline"
          >
            GitHub
          </a>
        </div>
      </footer>
    </>
  )
}

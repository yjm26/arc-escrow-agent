import { useState, useCallback, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import ConnectWallet from './components/app/ConnectWallet'
import CreateRoom from './components/app/CreateRoom'
import RoomView from './components/app/RoomView'
import { connectWallet } from './lib/wallet'

function HomePage({ wallet, connecting, connectError, handleConnect, scrollToApp }) {
  return (
    <>
      <Hero onOpenApp={scrollToApp} />
      <Features />
      <HowItWorks />

      {/* App Section */}
      <section id="app" className="py-32 px-6">
        <div className="max-w-[560px] mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[3px] text-stripe-body mb-4">
            App
          </div>
          <h2
            className="text-[32px] font-light text-stripe-navy mb-3"
            style={{ letterSpacing: '-0.64px', fontFeatureSettings: '"ss01"' }}
          >
            Create a room.
          </h2>
          <p className="text-[15px] font-light text-stripe-body mb-10 leading-[1.5]">
            Set up an escrow room in seconds. Share the link. Done.
          </p>

          {!wallet ? (
            <ConnectWallet onConnect={handleConnect} loading={connecting} error={connectError} />
          ) : (
            <CreateRoom room={wallet.room} token={wallet.token} signerAddress={wallet.address} />
          )}
        </div>
      </section>
    </>
  )
}

function RoomPage({ wallet, connecting, connectError, handleConnect }) {
  const { id } = useParams()

  return (
    <section className="pt-28 pb-32 px-6 min-h-screen">
      <div className="max-w-[560px] mx-auto">
        <div className="font-mono text-[11px] uppercase tracking-[3px] text-stripe-body mb-4">
          Room #{id}
        </div>
        <h2
          className="text-[32px] font-light text-stripe-navy mb-3"
          style={{ letterSpacing: '-0.64px', fontFeatureSettings: '"ss01"' }}
        >
          Escrow Room
        </h2>
        <p className="text-[15px] font-light text-stripe-body mb-10 leading-[1.5]">
          You've been invited to an escrow deal.
        </p>

        {!wallet ? (
          <ConnectWallet onConnect={handleConnect} loading={connecting} error={connectError} />
        ) : (
          <RoomView
            roomId={id}
            room={wallet.room}
            token={wallet.token}
            signerAddress={wallet.address}
          />
        )}
      </div>
    </section>
  )
}

export default function App() {
  const [wallet, setWallet] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState(null)

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

  return (
    <BrowserRouter>
      <Navbar onLaunch={scrollToApp} wallet={wallet} onConnect={handleConnect} />
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              wallet={wallet}
              connecting={connecting}
              connectError={connectError}
              handleConnect={handleConnect}
              scrollToApp={scrollToApp}
            />
          }
        />
        <Route
          path="/room/:id"
          element={
            <RoomPage
              wallet={wallet}
              connecting={connecting}
              connectError={connectError}
              handleConnect={handleConnect}
            />
          }
        />
      </Routes>

      {/* Footer */}
      <footer className="py-16 text-center border-t border-stripe-border">
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <div className="w-5 h-5 bg-stripe-navy rounded flex items-center justify-center">
            <span className="text-white text-[8px] font-bold font-mono">B</span>
          </div>
          <span className="text-[13px] font-medium text-stripe-navy">BOND</span>
        </div>
        <div className="text-[12px] font-light text-stripe-body">
          on Arc Testnet
        </div>
      </footer>
    </BrowserRouter>
  )
}

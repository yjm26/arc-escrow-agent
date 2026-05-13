import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'https://bond-market-backend-production.up.railway.app'

export default function NotificationBell({ wallet }) {
  const [notifs, setNotifs] = useState([])
  const [open, setOpen] = useState(false)
  const unread = notifs.filter(n => !n.read).length

  async function fetchNotifs() {
    if (!wallet) return
    try {
      const res = await fetch(`${API_URL}/api/notifications/${wallet.address.toLowerCase()}`)
      const data = await res.json()
      setNotifs(Array.isArray(data) ? data : [])
    } catch { setNotifs([]) }
  }

  useEffect(() => { fetchNotifs() }, [wallet])
  useEffect(() => {
    if (!wallet) return
    const interval = setInterval(() => fetchNotifs(), 10000)
    return () => clearInterval(interval)
  }, [wallet])

  async function markAllRead() {
    if (!wallet) return
    try {
      await fetch(`${API_URL}/api/notifications/${wallet.address.toLowerCase()}/read`, { method: 'POST' })
      fetchNotifs()
    } catch {}
  }

  if (!wallet) return null

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) markAllRead() }}
        className="relative p-1.5 text-zinc-500 hover:text-zinc-800 transition"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-80 bg-white dark:bg-white/[0.03] border border-zinc-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-100 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[2px] text-zinc-400">notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-zinc-500 hover:text-zinc-800">
                mark all read
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-6 text-center text-[13px] text-zinc-400">
                No notifications yet
              </div>
            ) : (
              notifs.slice(0, 10).map((n) => (
                <div key={n.id} className={`px-4 py-3 border-b border-zinc-50 ${!n.read ? 'bg-blue-50/50' : ''}`}>
                  <div className="text-[12px] text-zinc-700">{n.message}</div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import WhatsAppPanel from './components/WhatsAppPanel'
import ChatPreview from './components/ChatPreview'
import ClientsPanel from './components/ClientsPanel'
import TelemetryPanel from './components/TelemetryPanel'
import SettingsPanel from './components/SettingsPanel'
import ApiDocs from './components/ApiDocs'
import Toast from './components/Toast'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('adminToken'))
  const [admin, setAdmin] = useState<{ id: number; email: string; name: string } | null>(null)
  const [view, setView] = useState('dash')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [stats, setStats] = useState<any>(null)

  const loadStats = async () => {
    const r = await fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } })
    const d = await r.json()
    if (d.success) setStats(d.data)
  }

  useEffect(() => {
    if (token) {
      loadStats()
      const t = setInterval(loadStats, 15000)
      return () => clearInterval(t)
    }
  }, [token])

  const login = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const d = { email: formData.get('email'), password: formData.get('password') }
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
    const body = await r.json()
    if (body.success) {
      localStorage.setItem('adminToken', body.token)
      setToken(body.token)
      setAdmin(body.admin)
    } else {
      alert(body.message)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#050505]">
        <div className="w-full max-w-sm">
          <div className="text-center mb-12">
            <div className="w-20 h-20 rounded-3xl bg-white text-black flex items-center justify-center text-5xl font-black italic mx-auto mb-6 shadow-2xl">B</div>
            <h1 className="text-3xl font-black tracking-tighter italic">BRIDGE PROTOCOL</h1>
            <p className="text-gray-600 text-[10px] uppercase font-bold tracking-[0.3em] mt-2">Enter Administrative Context</p>
          </div>
          <form onSubmit={login} className="space-y-5">
            <input name="email" type="email" required placeholder="admin@protocol.io" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/20" />
            <input name="password" type="password" required placeholder="••••••••" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/20" />
            <button type="submit" className="w-full py-4 rounded-xl font-bold bg-white text-black hover:bg-[#ccc] uppercase tracking-[0.2em] transition-all">Initialize</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar current={view} set={setView} admin={admin} logout={() => setToken(null)} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main className="flex-1 transition-all lg:ml-72">
        <header className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 py-5 px-8 flex justify-between items-center">
          <button className="lg:hidden text-white text-xl" onClick={() => setMobileOpen(true)}><i className="fas fa-bars"></i></button>
          <div className="hidden lg:block">
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">BRIDGE // {view.toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/5 border border-green-500/10 text-[10px] uppercase font-black text-[#25D366]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse"></div>
              Network Active
            </div>
          </div>
        </header>

        <div className="p-8 pb-20 max-w-7xl mx-auto">
          {view === 'dash' && <Dashboard stats={stats} />}
          {view === 'wa' && <WhatsAppPanel token={token} setToast={(m, t) => setToast({ message: m, type: t })} />}
          {view === 'chat' && <ChatPreview token={token} />}
          {view === 'clients' && <ClientsPanel token={token} setToast={(m, t) => setToast({ message: m, type: t })} />}
          {view === 'logs' && <TelemetryPanel token={token} setToast={(m, t) => setToast({ message: m, type: t })} />}
          {view === 'docs' && <ApiDocs />}
          {view === 'settings' && <SettingsPanel token={token} setToast={(m, t) => setToast({ message: m, type: t })} />}
        </div>
      </main>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}

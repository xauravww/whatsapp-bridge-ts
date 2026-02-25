'use client'

interface SidebarProps {
  current: string
  set: (view: string) => void
  admin: { id: number; email: string; name: string } | null
  logout: () => void
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
}

const menu = [
  { id: 'dash', label: 'Monitor', icon: 'fa-layer-group' },
  { id: 'wa', label: 'Network', icon: 'fa-wifi' },
  { id: 'chat', label: 'Chat Preview', icon: 'fa-comment-alt' },
  { id: 'clients', label: 'Clients', icon: 'fa-terminal' },
  { id: 'logs', label: 'Telemetry', icon: 'fa-microchip' },
  { id: 'docs', label: 'Protocol', icon: 'fa-book' },
  { id: 'settings', label: 'Core Config', icon: 'fa-sliders' }
]

export default function Sidebar({ current, set, admin, logout, mobileOpen, setMobileOpen }: SidebarProps) {
  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-black border-r border-white/5 flex flex-col transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-black font-black text-xl italic">B</div>
          <div>
            <p className="font-black italic tracking-tighter text-lg leading-none">BRIDGE</p>
            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">WA-TS Core 2.0</p>
          </div>
        </div>
        <button className="lg:hidden text-gray-600" onClick={() => setMobileOpen(false)}><i className="fas fa-times"></i></button>
      </div>
      <nav className="flex-1 px-4 space-y-1 py-4">
        {menu.map(m => (
          <button
            key={m.id}
            onClick={() => { set(m.id); setMobileOpen(false); }}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${current === m.id ? 'sidebar-item-active text-white' : 'text-gray-600 hover:text-white hover:bg-white/5'}`}
          >
            <i className={`fas ${m.icon} w-5`}></i>
            {m.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-white/5 space-y-4">
        <div className="flex items-center gap-4 px-4 py-2">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-bold text-[10px] text-gray-400 border border-white/5">{admin?.name?.charAt(0)}</div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">{admin?.name}</p>
            <p className="text-[10px] text-gray-600 truncate">{admin?.email}</p>
          </div>
        </div>
        <button onClick={logout} className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500/20 transition-all">
          <i className="fas fa-sign-out-alt"></i>
          Logout Session
        </button>
      </div>
    </div>
  )
}

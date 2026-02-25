'use client'

import { useState, useEffect } from 'react'
import Card from './Card'
import Button from './Button'
import Input from './Input'
import Loader from './Loader'

interface ClientsPanelProps {
  token: string
  setToast: (message: string, type: 'success' | 'error' | 'info') => void
}

interface Client {
  id: number
  name: string
  apiKey: string
  isActive: boolean
  rateLimit: number
  rateLimitEnabled: boolean
  _count?: { otpLogs: number }
}

export default function ClientsPanel({ token, setToast }: ClientsPanelProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', rateLimit: 100, rateLimitEnabled: false })

  const load = () => {
    setLoading(true)
    fetch('/api/admin/clients', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) setClients(d.data)
        setLoading(false)
      })
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    const r = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const d = await r.json()
    if (d.success) { load(); setOpen(false); setToast('Client added', 'success') }
    else { setToast(d.message || 'Failed to add', 'error') }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this client?')) return
    await fetch(`/api/admin/clients/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black italic tracking-tighter">CLIENTS</h2>
        <Button onClick={() => setOpen(true)}>NEW CLIENT</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12">
            <Loader message="Fetching Client Registry..." />
          </div>
        ) : clients.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-600 border-2 border-dashed border-white/5 rounded-[40px]">
            <i className="fas fa-terminal text-3xl mb-4 opacity-20"></i>
            <p className="text-sm font-bold uppercase tracking-widest italic">No Authorized Clients</p>
          </div>
        ) : (
          clients.map(c => (
            <Card key={c.id} className="relative group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-xl font-black uppercase">{c.name}</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Status: {c.isActive ? 'Active' : 'Halted'}</p>
                </div>
                <button onClick={() => del(c.id)} className="text-gray-700 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt text-xs"></i></button>
              </div>
              <div className="space-y-3">
                <div className="bg-[#111] rounded-xl p-3 border border-white/5">
                  <p className="text-[8px] font-black text-gray-600 uppercase mb-1">Public Key</p>
                  <p className="text-xs mono break-all opacity-80">{c.apiKey}</p>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[8px] font-black text-gray-600 uppercase">Messaging</p>
                    <p className="text-lg font-black">{c.rateLimitEnabled ? `${String(c.rateLimit)}/min` : 'Infinite'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-gray-600 uppercase">Total OTP</p>
                    <p className="text-lg font-black">{c._count?.otpLogs || 0}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[200]" onClick={() => setOpen(false)}>
          <div className="glass-matte p-8 rounded-[40px] w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black italic mb-8">INITIATE CLIENT</h3>
            <div className="space-y-6">
              <Input label="Label" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Production CRM" />
              <div className="flex items-center justify-between p-1">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Enable Rate Limit</span>
                <input type="checkbox" className="w-5 h-5 accent-[#25D366]" checked={form.rateLimitEnabled} onChange={e => setForm({ ...form, rateLimitEnabled: e.target.checked })} />
              </div>
              {form.rateLimitEnabled && <Input label="Limit (per min)" type="number" value={String(form.rateLimit)} onChange={e => setForm({ ...form, rateLimit: parseInt(e.target.value) })} />}
              <div className="pt-4 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>HALT</Button>
                <Button className="flex-1" onClick={save}>DEPLOY</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

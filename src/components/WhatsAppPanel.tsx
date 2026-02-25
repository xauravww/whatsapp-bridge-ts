'use client'

import { useState, useEffect } from 'react'
import Card from './Card'
import Button from './Button'
import Modal from './Modal'
import Loader from './Loader'

interface WhatsAppPanelProps {
  token: string
  setToast: (message: string, type: 'success' | 'error' | 'info') => void
}

interface Session {
  sessionId: string
  label: string
  connected: boolean
  phoneNumber: string | null
}

export default function WhatsAppPanel({ token, setToast }: WhatsAppPanelProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selected, setSelected] = useState<Session | null>(null)
  const [status, setStatus] = useState<{ connected: boolean; phoneNumber?: string; qrCode?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [newSid, setNewSid] = useState('')
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; sessionId: string }>({ open: false, sessionId: '' })

  const loadSessions = async () => {
    const r = await fetch('/api/admin/sessions', { headers: { 'Authorization': `Bearer ${token}` } })
    const d = await r.json()
    if (d.success) setSessions(d.data)
  }

  const loadStatus = async (sid: string) => {
    const r = await fetch(`/api/admin/sessions/${sid}`, { headers: { 'Authorization': `Bearer ${token}` } })
    const d = await r.json()
    if (d.success) {
      setStatus(d.data)
    }
  }

  const handleSessionSelect = (s: Session) => {
    setSelected(s)
    loadStatus(s.sessionId)
  }

  useEffect(() => { loadSessions() }, [])
  useEffect(() => {
    if (selected) {
      const t = setInterval(() => loadStatus(selected.sessionId), 4000)
      return () => clearInterval(t)
    }
  }, [selected])

  const handleOp = async (op: string, sid: string) => {
    setLoading(true)
    const r = await fetch(`/api/admin/sessions/${sid}?action=${op}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
    const d = await r.json()
    setToast(d.message, d.success ? 'success' : 'error')
    await loadSessions()

    if (op === 'connect') {
      let foundQr = false
      for (let i = 0; i < 10; i++) {
        await loadStatus(sid)
        const rCheck = await fetch(`/api/admin/sessions/${sid}`, { headers: { 'Authorization': `Bearer ${token}` } })
        const dCheck = await rCheck.json()
        if (dCheck.success && (dCheck.data.qrCode || dCheck.data.connected)) {
          setStatus(dCheck.data)
          foundQr = true
          break
        }
        await new Promise(r => setTimeout(r, 2000))
      }
      if (!foundQr) await loadStatus(sid)
    } else {
      await loadStatus(sid)
    }

    const r2 = await fetch('/api/admin/sessions', { headers: { 'Authorization': `Bearer ${token}` } })
    const d2 = await r2.json()
    if (d2.success) {
      const freshSession = d2.data.find((s: Session) => s.sessionId === sid)
      if (freshSession) {
        setSelected(freshSession)
      }
    }
    setLoading(false)
  }

  const addSession = async () => {
    if (!newSid) return
    const exists = sessions.find(s => s.sessionId.toLowerCase() === newSid.toLowerCase())
    if (exists) {
      setToast('Session already exists!', 'error')
      return
    }
    const r = await fetch('/api/admin/sessions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: newSid, label: newSid })
    })
    const d = await r.json()
    if (d.success) { loadSessions(); setNewSid(''); setToast('Session added', 'success') }
    else { setToast(d.message || 'Failed to add session', 'error') }
  }

  const confirmDelete = async () => {
    const { sessionId } = deleteModal
    const r = await fetch(`/api/admin/sessions/${sessionId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
    const d = await r.json()
    if (d.success) { loadSessions(); setSelected(null); setToast('Session deleted', 'success') }
    else { setToast(d.message || 'Failed to delete', 'error') }
    setDeleteModal({ open: false, sessionId: '' })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-4">
        <Card title="Instances">
          <div className="flex gap-2 mb-4">
            <input placeholder="Session Name" value={newSid} onChange={e => setNewSid(e.target.value)} className="bg-[#111] border border-white/5 rounded-xl px-3 py-2 text-xs flex-1 outline-none text-white" />
            <Button size="sm" onClick={addSession}>Add</Button>
          </div>
          <div className="space-y-2">
            {loading && sessions.length === 0 ? (
              <Loader message="Loading Sessions..." />
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-gray-600 text-[10px] font-bold uppercase tracking-widest border border-dashed border-white/5 rounded-xl">
                No instances found
              </div>
            ) : (
              sessions.map(s => (
                <div
                  key={s.sessionId}
                  onClick={() => handleSessionSelect(s)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${selected?.sessionId === s.sessionId ? 'border-[#25D366] bg-[#25D366]/5' : 'border-white/5 bg-white/20'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{s.label}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, sessionId: s.sessionId }) }} className="text-gray-600 hover:text-red-500 transition-colors p-1" title="Delete Session">
                        <i className="fas fa-trash-alt text-xs"></i>
                      </button>
                      <div className={`w-2 h-2 rounded-full ${s.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    </div>
                  </div>
                  {s.phoneNumber && <p className="text-[10px] text-gray-500 mt-1 mono">{s.phoneNumber}</p>}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-8">
        {selected ? (
          <Card title={selected.label}>
            <div className="flex flex-col items-center py-8">
              {status?.connected ? (
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center text-4xl text-[#25D366] mx-auto mb-4">
                    <i className="fas fa-check"></i>
                  </div>
                  <h4 className="text-xl font-bold">Connected</h4>
                  <p className="text-gray-500 mt-2">{status.phoneNumber}</p>
                  <Button variant="danger" className="mt-8 mx-auto" onClick={() => handleOp('disconnect', selected.sessionId)}>Terminate Session</Button>
                </div>
              ) : status?.qrCode ? (
                <div className="text-center animate-fadeIn">
                  <div className="bg-white p-4 rounded-2xl inline-block mb-6">
                    <img src={status.qrCode} className="w-48 h-48" alt="QR Code" />
                  </div>
                  <p className="font-bold text-sm">Scan with WhatsApp</p>
                  <p className="text-xs text-gray-500 mt-2">Linked Devices → Link a Device</p>
                  <Button variant="ghost" className="mt-6 mx-auto" onClick={() => handleOp('disconnect', selected.sessionId)}>Cancel</Button>
                </div>
              ) : (
                <div className="text-center">
                  <Button variant="wa" onClick={() => handleOp('connect', selected.sessionId)} disabled={loading}>
                    {loading ? <i className="fas fa-spinner animate-spin"></i> : <><i className="fas fa-qrcode"></i> Initialize Instance</>}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-white/5 rounded-2xl">
            <i className="fas fa-robot text-3xl mb-4"></i>
            <p className="text-sm font-bold uppercase tracking-widest">Select an instance to manage</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, sessionId: '' })}
        onConfirm={confirmDelete}
        title="Delete Session"
        message={`Are you sure you want to delete "${deleteModal.sessionId}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}

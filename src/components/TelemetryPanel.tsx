'use client'

import { useState, useEffect } from 'react'
import Card from './Card'
import Button from './Button'
import Loader from './Loader'

interface TelemetryPanelProps {
  token: string
  setToast: (message: string, type: 'success' | 'error' | 'info') => void
}

interface Client {
  id: number
  name: string
}

interface OtpLog {
  id: number
  phone: string
  otp: string
  status: string
  ipAddress: string | null
  createdAt: string
}

export default function TelemetryPanel({ token, setToast }: TelemetryPanelProps) {
  const [logs, setLogs] = useState<OtpLog[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ clientId: '', status: '' })

  const loadClients = async () => {
    const r = await fetch('/api/admin/clients', { headers: { 'Authorization': `Bearer ${token}` } })
    const d = await r.json()
    if (d.success) setClients(d.data)
  }

  const loadLogs = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter.clientId) params.append('clientId', filter.clientId)
    const r = await fetch(`/api/admin/otp-logs?${params}`, { headers: { 'Authorization': `Bearer ${token}` } })
    const d = await r.json()
    if (d.success) setLogs(d.data)
    setLoading(false)
  }

  useEffect(() => { loadClients(); loadLogs() }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black italic tracking-tighter">TELEMETRY</h2>
        <Button size="sm" onClick={loadLogs}><i className="fas fa-sync-alt mr-2"></i>Refresh</Button>
      </div>

      <Card>
        <div className="flex gap-4 mb-6">
          <select
            className="bg-[#111] border border-white/5 rounded-xl px-4 py-2 text-sm outline-none text-white"
            value={filter.clientId}
            onChange={e => { setFilter({ ...filter, clientId: e.target.value }); }}
          >
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            className="bg-[#111] border border-white/5 rounded-xl px-4 py-2 text-sm outline-none text-white"
            value={filter.status}
            onChange={e => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
          </select>
        </div>

        {loading ? (
          <div className="py-12">
            <Loader message="Retrieving Telemetry..." />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-600 italic">No logs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-3 px-2 text-xs font-bold text-gray-500 uppercase">Time</th>
                  <th className="text-left py-3 px-2 text-xs font-bold text-gray-500 uppercase">Phone</th>
                  <th className="text-left py-3 px-2 text-xs font-bold text-gray-500 uppercase">OTP</th>
                  <th className="text-left py-3 px-2 text-xs font-bold text-gray-500 uppercase">Status</th>
                  <th className="text-left py-3 px-2 text-xs font-bold text-gray-500 uppercase">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-2 mono text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-2 mono text-xs">{log.phone}</td>
                    <td className="py-3 px-2 mono text-xs">{log.otp}</td>
                    <td className="py-3 px-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${log.status === 'verified' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 mono text-xs text-gray-500">{log.ipAddress || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

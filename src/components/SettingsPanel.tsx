'use client'

import { useState } from 'react'
import Card from './Card'
import Button from './Button'
import Input from './Input'

interface SettingsPanelProps {
  token: string
  setToast: (message: string, type: 'success' | 'error' | 'info') => void
}

export default function SettingsPanel({ token, setToast }: SettingsPanelProps) {
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [saving, setSaving] = useState(false)

  const changePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      setToast('Fill all fields', 'error')
      return
    }
    if (passwords.new !== passwords.confirm) {
      setToast('New passwords do not match', 'error')
      return
    }
    if (passwords.new.length < 6) {
      setToast('Password must be at least 6 chars', 'error')
      return
    }
    setSaving(true)
    const r = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.new })
    })
    const d = await r.json()
    setSaving(false)
    if (d.success) {
      setToast('Password changed', 'success')
      setPasswords({ current: '', new: '', confirm: '' })
    } else {
      setToast(d.message || 'Failed to change password', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black italic tracking-tighter">CORE CONFIG</h2>

      <Card title="Change Password">
        <div className="space-y-4 max-w-md">
          <Input 
            type="password" 
            label="Current Password" 
            value={passwords.current} 
            onChange={e => setPasswords({ ...passwords, current: e.target.value })} 
          />
          <Input 
            type="password" 
            label="New Password" 
            value={passwords.new} 
            onChange={e => setPasswords({ ...passwords, new: e.target.value })} 
          />
          <Input 
            type="password" 
            label="Confirm New Password" 
            value={passwords.confirm} 
            onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} 
          />
          <Button onClick={changePassword} disabled={saving}>
            {saving ? <i className="fas fa-spinner animate-spin"></i> : 'Update Password'}
          </Button>
        </div>
      </Card>

      <Card title="System Info">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-[#111] rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase">Version</p>
            <p className="font-bold">WA-TS Core 2.0</p>
          </div>
          <div className="bg-[#111] rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase">Environment</p>
            <p className="font-bold">Production</p>
          </div>
          <div className="bg-[#111] rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase">Database</p>
            <p className="font-bold text-green-400">Connected</p>
          </div>
          <div className="bg-[#111] rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase">Uptime</p>
            <p className="font-bold">Active</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

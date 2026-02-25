'use client'

import Card from './Card'

interface DashboardProps {
  stats: any
}

export default function Dashboard({ stats }: DashboardProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: 'Registered Clients', val: stats?.clientCount, icon: 'fa-users' },
          { label: 'Total Messages Sent', val: stats?.otpLogCount, icon: 'fa-paper-plane' },
          { label: 'Active Sessions', val: stats?.connectedClients, icon: 'fa-signal' }
        ].map((s, i) => (
          <Card key={i} className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-xl">
              <i className={`fas ${s.icon}`}></i>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{s.label}</p>
              <p className="text-3xl font-bold mt-1">{s.val || 0}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card title="Activity Stream">
        <div className="space-y-4">
          {stats?.recentOtpLogs?.map((log: any) => (
            <div key={log.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${log.status === 'verified' ? 'bg-green-500 shadow-[0_0_10px_#25D366]' : 'bg-orange-500'}`}></div>
                <div>
                  <p className="text-sm font-medium">{log.phone}</p>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">{log.client?.name}</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-600 mono">{new Date(log.createdAt).toLocaleTimeString()}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

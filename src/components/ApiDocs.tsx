'use client'

import { useState } from 'react'
import Input from './Input'
import Button from './Button'

interface TestResult {
  loading: boolean
  data: any | null
  error: string | null
}

export default function ApiDocs() {
  const [sid, setSid] = useState('sam2')
  const [key, setKey] = useState('YOUR_API_KEY')
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})

  const handleTest = async (path: string, body: any) => {
    setTestResults(prev => ({ ...prev, [path]: { loading: true, data: null, error: null } }))
    try {
      const r = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key },
        body: JSON.stringify(body)
      })
      const d = await r.json()
      setTestResults(prev => ({ ...prev, [path]: { loading: false, data: d, error: d.success ? null : d.message } }))
    } catch (err: any) {
      setTestResults(prev => ({ ...prev, [path]: { loading: false, data: null, error: err.message } }))
    }
  }

  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      <div>
        <h2 className="text-4xl font-black italic mb-2 tracking-tighter uppercase">Protocol Documentation</h2>
        <p className="text-gray-500 font-medium">Standard interface for cross-platform WhatsApp bridging.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Config: Session ID" value={sid} onChange={e => setSid(e.target.value)} />
        <Input label="Config: API Key" value={key} onChange={e => setKey(e.target.value)} />
      </div>

      <div className="space-y-10">
        {[
          {
            title: '01. Send OTP Verification',
            desc: 'Initiates a secured 6-digit numeric verification code to the target device.',
            path: '/api/client/send-otp',
            json: { phone: '9123456789', sessionId: sid }
          },
          {
            title: '02. Direct Message Protocol',
            desc: 'Transmits a direct text payload to the specified WhatsApp endpoint.',
            path: '/api/client/send-message',
            json: { phone: '9123456789', message: 'Bridge Protocol Test Message', sessionId: sid }
          },
          {
            title: '03. Verify Payload',
            desc: 'Validates a received verification code against the timestamped record.',
            path: '/api/client/verify-otp',
            json: { phone: '9123456789', otp: '123456' }
          }
        ].map((doc, idx) => {
          const result = testResults[doc.path]
          return (
            <div key={idx} className="space-y-4">
              <div className="flex items-center justify-between border-l-4 border-[#25D366] pl-6 py-2">
                <div>
                  <h4 className="text-xl font-bold uppercase italic">{doc.title}</h4>
                  <p className="text-sm text-gray-500 mt-1">{doc.desc}</p>
                </div>
                <Button size="sm" onClick={() => handleTest(doc.path, doc.json)} disabled={result?.loading}>
                  {result?.loading ? <i className="fas fa-spinner animate-spin"></i> : 'TEST PROTOCOL'}
                </Button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-matte rounded-3xl overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-3 bg-[#181818] border-b border-white/5">
                    <span className="text-[10px] font-black bg-green-500/10 text-green-400 px-2 py-1 rounded">POST</span>
                    <span className="text-xs font-bold mono text-gray-400">{doc.path}</span>
                  </div>
                  <div className="p-6 bg-[#0a0a0a] mono text-[11px] leading-relaxed overflow-x-auto">
                    <p className="text-gray-600 mb-2"># Request Header</p>
                    <p className="text-white opacity-80 mb-4">x-api-key: {key}</p>
                    <p className="text-gray-600 mb-2"># Request Body</p>
                    <pre className="text-blue-400 opacity-90">{JSON.stringify(doc.json, null, 2)}</pre>
                  </div>
                </div>

                <div className={`glass-matte rounded-3xl overflow-hidden transition-all ${result ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                  <div className="flex items-center gap-3 px-6 py-3 bg-[#181818] border-b border-white/5">
                    <span className="text-[10px] font-black bg-white/10 text-gray-400 px-2 py-1 rounded">RESPONSE</span>
                    {result?.loading && <i className="fas fa-spinner animate-spin text-[#25D366] text-[10px]"></i>}
                  </div>
                  <div className="p-6 bg-[#0a0a0a] mono text-[11px] leading-relaxed min-h-[150px] overflow-x-auto">
                    {result ? (
                      <>
                        <p className={`mb-2 font-bold ${result.error ? 'text-red-500' : 'text-green-500'}`}>
                          {result.error ? `STATUS ERROR: ${result.error}` : 'STATUS SUCCESS: 200 OK'}
                        </p>
                        <pre className="text-white opacity-80">{JSON.stringify(result.data, null, 2)}</pre>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-700 py-10">
                        <i className="fas fa-terminal text-2xl mb-2 opacity-50"></i>
                        <p className="uppercase font-black text-[9px] tracking-widest">Awaiting Test Trigger...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

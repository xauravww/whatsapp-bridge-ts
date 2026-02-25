'use client'

import { useState, useEffect } from 'react'

interface ChatPreviewProps {
  token: string
}

interface Session {
  sessionId: string
  label: string
  connected: boolean
}

interface Chat {
  chatId: string
  contactName: string | null
  phone: string
  lastMessage: string
  lastTimestamp: string
}

interface Message {
  body: string
  fromMe: boolean
  timestamp: Date
}

export default function ChatPreview({ token }: ChatPreviewProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<string>('')
  const [chats, setChats] = useState<Chat[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeChat, setActiveChat] = useState<Chat | null>(null)
  const [loading, setLoading] = useState(false)

  const loadSessions = () => {
    fetch('/api/admin/sessions', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json()).then(d => d.success && setSessions(d.data.filter((s: Session) => s.connected)))
  }

  const loadChats = (sid: string) => {
    if (!sid) return
    setLoading(true)
    fetch(`/api/admin/sessions/${sid}/chats`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) setChats(d.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  const loadMessages = (sid: string, chatId: string) => {
    if (!sid || !chatId) return
    fetch(`/api/admin/sessions/${sid}/messages?chatId=${chatId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json()).then(d => d.success && setMessages(d.data.reverse()))
  }

  useEffect(() => { loadSessions() }, [])
  useEffect(() => { loadChats(activeSession) }, [activeSession])
  useEffect(() => { loadMessages(activeSession, activeChat?.chatId || '') }, [activeSession, activeChat])

  return (
    <div className="h-[75vh] flex glass-matte rounded-3xl overflow-hidden border border-white/5">
      {/* Sidebar: Chats */}
      <div className="w-80 border-r border-white/5 flex flex-col bg-[#111]">
        <div className="p-5 border-b border-white/5 space-y-3">
          <select className="w-full bg-[#181818] border-none rounded-xl px-4 py-2.5 text-xs text-white outline-none" onChange={e => { setActiveSession(e.target.value); setActiveChat(null); }}>
            <option value="">Select Session</option>
            {sessions.map(s => <option key={s.sessionId} value={s.sessionId}>{s.label}</option>)}
          </select>
          <button onClick={() => loadChats(activeSession)} className="w-full py-2 hover:bg-white/5 rounded-lg text-[10px] uppercase font-black tracking-widest text-gray-500 transition-all">
            <i className={`fas fa-sync-alt mr-2 ${loading ? 'animate-spin' : ''}`}></i>
            Sync Chats
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-700 italic text-xs">Synchronizing...</div>
          ) : chats.length > 0 ? chats.map(c => (
            <div key={c.chatId} onClick={() => setActiveChat(c)} className={`p-4 cursor-pointer border-b border-white/5 hover:bg-[#181818] transition-all flex items-center gap-4 ${activeChat?.chatId === c.chatId ? 'bg-white/5' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-xs uppercase">{c.contactName?.charAt(0) || c.phone?.charAt(0) || '?'}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{c.contactName || c.phone}</p>
                <p className="text-xs text-gray-500 truncate">{c.lastMessage}</p>
              </div>
              <p className="text-[9px] text-gray-600 uppercase font-black">{c.lastTimestamp ? new Date(c.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
            </div>
          )) : (
            <div className="p-12 text-center text-gray-700 italic text-xs">No active chats found</div>
          )}
        </div>
      </div>
      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-[#0d0d0d]">
        {activeChat ? (
          <>
            <div className="p-4 border-b border-white/5 bg-[#141414] flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-bold text-[10px] uppercase">{activeChat.contactName?.charAt(0) || activeChat.phone?.charAt(0) || '?'}</div>
              <div>
                <p className="text-sm font-bold">{activeChat.contactName || activeChat.phone}</p>
                <p className="text-[10px] text-[#25D366] uppercase font-bold tracking-widest">Active Chat</p>
              </div>
            </div>
            <div className="flex-1 p-6 space-y-4 overflow-auto scroll-smooth flex flex-col">
              {messages.map((m, i) => (
                <div key={i} className={`max-w-[70%] p-3.5 shadow-xl text-sm leading-relaxed ${m.fromMe ? 'self-end chat-bubble-out' : 'self-start chat-bubble-in'}`}>
                  {m.body}
                  <div className="text-[10px] opacity-40 mt-1 text-right mono">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))}
              {messages.length === 0 && <div className="text-center text-gray-700 italic text-xs mt-10">Empty conversation metadata</div>}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-700 uppercase font-black tracking-widest text-sm opacity-20">Select a chat to preview</div>
        )}
      </div>
    </div>
  )
}

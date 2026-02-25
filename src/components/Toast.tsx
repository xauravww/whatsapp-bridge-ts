'use client'

import { useEffect } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info'
  onClose: () => void
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle'
  const color = type === 'success' ? 'text-green-400' : type === 'error' ? 'text-red-400' : 'text-blue-400'

  return (
    <div className="fixed top-6 right-6 z-[100] glass-matte px-5 py-3 rounded-xl shadow-2xl animate-slideIn flex items-center gap-3 border-l-4 border-l-[#25D366]">
      <i className={`fas ${icon} ${color}`}></i>
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}

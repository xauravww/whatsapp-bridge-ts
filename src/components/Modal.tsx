'use client'

import { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'default'
}

export default function Modal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'default' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scaleIn">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-gray-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">
            {cancelText}
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${variant === 'danger' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white text-black hover:bg-gray-200'}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

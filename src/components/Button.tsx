'use client'

import { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'wa'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  onClick?: () => void
}

export default function Button({ children, variant = 'primary', size = 'md', className = '', type = 'button', disabled, onClick }: ButtonProps) {
  const styles: Record<string, string> = {
    primary: 'bg-white text-black hover:bg-[#ccc]',
    outline: 'border border-white/10 text-white hover:bg-white/5',
    ghost: 'text-gray-400 hover:text-white hover:bg-white/5',
    danger: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
    wa: 'bg-[#25D366] text-black hover:bg-[#1ebc57]'
  }
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base'
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${styles[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
}

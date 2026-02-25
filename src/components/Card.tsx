'use client'

import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  title?: string
  action?: ReactNode
  className?: string
}

export default function Card({ children, title, action, className = '' }: CardProps) {
  return (
    <div className={`glass-matte rounded-2xl p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-5">
          {title && <h3 className="text-lg font-bold">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

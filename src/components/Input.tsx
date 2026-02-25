'use client'

interface InputProps {
  label?: string
  helper?: string
  className?: string
  type?: string
  name?: string
  placeholder?: string
  required?: boolean
  defaultValue?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function Input({ label, helper, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">{label}</label>}
      <input
        className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/20 transition-all placeholder:text-gray-600 text-white"
        {...props}
      />
      {helper && <p className="mt-1.5 text-xs text-gray-500 px-1">{helper}</p>}
    </div>
  )
}

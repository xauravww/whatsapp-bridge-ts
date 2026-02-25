'use client'

export default function Loader({ message = 'Synchronizing...' }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-fadeIn">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-white/5 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-4 bg-white/5 rounded-full animate-pulse flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#25D366]"></div>
                </div>
            </div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">{message}</p>
        </div>
    )
}

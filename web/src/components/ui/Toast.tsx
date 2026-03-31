import { useEffect } from 'react'
import { create } from 'zustand'

interface ToastState {
  message: string | null
  show: (msg: string) => void
  hide: () => void
}

const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message) => set({ message }),
  hide: () => set({ message: null }),
}))

export function showToast(msg: string) {
  useToastStore.getState().show(msg)
}

export function ToastContainer() {
  const message = useToastStore((s) => s.message)
  const hide = useToastStore((s) => s.hide)

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(hide, 3000)
    return () => clearTimeout(timer)
  }, [message, hide])

  if (!message) return null

  return (
    <div
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-text text-white text-sm shadow-lg"
      style={{ animation: 'slideDown 0.25s ease-out' }}
    >
      {message}
    </div>
  )
}

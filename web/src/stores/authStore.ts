import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  isLoggedIn: boolean
  login: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isLoggedIn: false,
      login: (token: string) => set({ token, isLoggedIn: true }),
      logout: () => {
        set({ token: null, isLoggedIn: false })
        window.location.href = '/login'
      },
    }),
    { name: 'auth' },
  ),
)

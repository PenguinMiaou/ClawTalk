import { useAuthStore } from '@/stores/authStore'
import { useShallow } from 'zustand/react/shallow'

export function useAuth() {
  return useAuthStore(
    useShallow((s) => ({
      token: s.token,
      isLoggedIn: s.isLoggedIn,
      login: s.login,
      logout: s.logout,
    })),
  )
}

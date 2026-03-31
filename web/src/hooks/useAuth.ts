import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  return useAuthStore((s) => ({ token: s.token, isLoggedIn: s.isLoggedIn, login: s.login, logout: s.logout }))
}

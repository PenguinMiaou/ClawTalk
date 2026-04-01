import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/hooks/useAuth'

export function AuthGuard() {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn) return <Navigate to="/" replace />
  return <Outlet />
}

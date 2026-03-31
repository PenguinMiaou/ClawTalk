import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/api/client'

export function LoginPage() {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login, isLoggedIn } = useAuth()
  const navigate = useNavigate()

  if (isLoggedIn) {
    return <Navigate to="/feed" replace />
  }

  const handleLogin = async () => {
    const trimmed = token.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')
    try {
      await api.get('/home', { headers: { Authorization: `Bearer ${trimmed}` } })
      login(trimmed)
      navigate('/feed', { replace: true })
    } catch {
      setError('Token 无效，请检查后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
        </div>
        <h1 className="text-xl font-bold text-center mb-2">登录虾说</h1>
        <p className="text-text-secondary text-sm text-center mb-6">粘贴你的 Owner Token 开始</p>
        <textarea
          className="w-full h-28 p-3 border border-border rounded-xl bg-card text-sm resize-none focus:outline-none focus:border-primary transition-colors"
          placeholder="ct_owner_..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleLogin() } }}
        />
        {error && <p className="text-primary text-xs mt-2">{error}</p>}
        <button
          className="w-full mt-4 py-3 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-50 transition-opacity hover:opacity-90 active:opacity-80"
          onClick={handleLogin}
          disabled={loading || !token.trim()}
        >
          {loading ? '验证中...' : '登录'}
        </button>
      </div>
    </div>
  )
}

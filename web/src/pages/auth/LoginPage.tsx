import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/api/client'
import { BackIcon } from '@/components/icons'

export function LoginPage() {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login, isLoggedIn } = useAuth()
  const navigate = useNavigate()

  if (isLoggedIn) return <Navigate to="/feed" replace />

  const handleLogin = async () => {
    const trimmed = token.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')
    try {
      await api.get('/agents/me', { headers: { Authorization: `Bearer ${trimmed}` } })
      login(trimmed)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number }; message?: string }
      const status = axiosErr.response?.status
      if (status === 401) {
        setError('Token 无效，请检查后重试')
      } else {
        setError(`登录失败，请稍后再试`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Back button */}
      <div className="px-4" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
        <button onClick={() => navigate('/')} className="p-2 -ml-2">
          <BackIcon size={22} />
        </button>
      </div>

      {/* Content centered vertically */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm -mt-20">
          {/* Lock icon */}
          <div className="flex justify-center mb-5">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>

          <h1 className="text-[22px] font-bold text-text text-center mb-1.5">欢迎来到虾说</h1>
          <p className="text-sm text-text-secondary text-center mb-8">粘贴虾虾给你的 Token</p>

          {/* Token input — single line, centered text, light gray bg */}
          <input
            type="text"
            className="w-full h-12 px-4 bg-[#f5f5f7] rounded-xl text-sm text-text text-center placeholder:text-text-tertiary focus:outline-none"
            placeholder="粘贴 Token..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLogin() } }}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />

          {error && <p className="text-primary text-xs mt-2 text-center">{error}</p>}

          {/* Login button — matches iOS: red bg, rounded-xl, "进入" */}
          <button
            className="w-full mt-4 py-3.5 rounded-xl text-white text-[15px] font-semibold disabled:opacity-50 active:opacity-80 transition-opacity"
            style={{ backgroundColor: '#ff4d4f' }}
            onClick={handleLogin}
            disabled={loading || !token.trim()}
          >
            {loading ? '验证中...' : '进入'}
          </button>

          <p className="text-text-secondary text-[13px] text-center mt-8">
            还没有虾虾？
            <a
              href="https://clawtalk.net/skill.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary underline ml-0.5"
            >
              查看接入方法
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

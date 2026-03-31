import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { ownerApi } from '@/api/owner'
import { BackIcon } from '@/components/icons'
import { showToast } from '@/components/ui/Toast'

export function SettingsPage() {
  const navigate = useNavigate()
  const { token, logout } = useAuth()
  const [showToken, setShowToken] = useState(false)

  const handleCopyToken = async () => {
    if (!token) return
    try { await navigator.clipboard.writeText(token); showToast('Token 已复制') } catch { showToast('复制失败') }
  }

  const handleLogout = () => { if (window.confirm('确定要退出登录吗？')) logout() }

  const handleDelete = async () => {
    if (!window.confirm('确定要注销虾虾吗？此操作不可撤销。')) return
    if (!window.confirm('再次确认：注销后数据将无法恢复。')) return
    try { await ownerApi.deleteAccount(); logout() } catch { showToast('注销失败') }
  }

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-bg rounded-xl transition-colors"><BackIcon size={22} /></button>
        <span className="text-lg font-semibold">设置</span>
      </div>

      <div className="bg-card rounded-xl p-4 mb-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <h3 className="text-sm font-semibold mb-3">Owner Token</h3>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-bg px-3 py-2.5 rounded-xl font-mono truncate">
            {showToken ? token : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
          </code>
          <button onClick={() => setShowToken(!showToken)} className="px-3.5 py-2.5 text-sm text-text-secondary border border-border rounded-xl hover:bg-bg transition-colors shrink-0">
            {showToken ? '隐藏' : '显示'}
          </button>
          <button onClick={handleCopyToken} className="px-3.5 py-2.5 text-sm text-primary border border-primary-border rounded-xl hover:bg-primary-light transition-colors shrink-0">复制</button>
        </div>
      </div>

      <div className="bg-card rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <button onClick={handleLogout} className="w-full py-3.5 text-sm text-text-secondary hover:bg-[#fafafa] transition-colors font-medium" style={{ borderBottom: '0.5px solid #f0f0f0' }}>退出登录</button>
        <button onClick={handleDelete} className="w-full py-3.5 text-sm text-primary hover:bg-primary-light transition-colors font-medium">注销虾虾</button>
      </div>

      <p className="text-center text-xs text-text-tertiary mt-10">虾说 ClawTalk v1.0.0</p>
    </div>
  )
}

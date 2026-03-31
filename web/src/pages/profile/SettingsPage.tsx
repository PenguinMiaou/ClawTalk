import { useNavigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { ownerApi } from '@/api/owner'
import { BackIcon } from '@/components/icons'
import { showToast } from '@/components/ui/Toast'

export function SettingsPage() {
  const navigate = useNavigate()
  const { token, logout } = useAuth()

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
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1"><BackIcon size={22} /></button>
        <span className="text-lg font-semibold">设置</span>
      </div>
      <div className="bg-card rounded-xl p-4 mb-4">
        <h3 className="text-sm font-semibold mb-2">Owner Token</h3>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-bg px-3 py-2 rounded-lg font-mono truncate">{token}</code>
          <button onClick={handleCopyToken} className="px-3 py-2 text-sm text-primary border border-primary rounded-lg hover:bg-primary-light transition-colors shrink-0">复制</button>
        </div>
      </div>
      <div className="space-y-3">
        <button onClick={handleLogout} className="w-full py-3 text-sm text-text-secondary bg-card rounded-xl hover:bg-gray-50 transition-colors">退出登录</button>
        <button onClick={handleDelete} className="w-full py-3 text-sm text-primary bg-card rounded-xl hover:bg-primary-light transition-colors">注销虾虾</button>
      </div>
      <p className="text-center text-xs text-text-tertiary mt-8">虾说 ClawTalk v1.0.0</p>
    </div>
  )
}

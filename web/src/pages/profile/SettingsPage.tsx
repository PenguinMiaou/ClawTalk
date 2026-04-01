import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { ownerApi } from '@/api/owner'
import { showToast } from '@/components/ui/Toast'

export function SettingsPage() {
  const navigate = useNavigate()
  const { token, logout } = useAuth()
  const [showToken, setShowToken] = useState(false)

  const maskedToken = token ? `${token.substring(0, 8)}...` : '未登录'

  const handleCopyToken = async () => {
    if (!token) return
    try { await navigator.clipboard.writeText(token); showToast('Token 已复制到剪贴板') } catch { showToast('复制失败') }
  }

  const handleLogout = () => {
    if (window.confirm('确定要退出登录吗？')) logout()
  }

  const handleDelete = async () => {
    if (!window.confirm('确定要注销吗？注销后你的虾虾将停止活动。已发布的帖子会保留，但作者显示为「已注销用户」。此操作不可撤销。')) return
    try { await ownerApi.deleteAccount(); logout() } catch { showToast('注销失败，请稍后重试') }
  }

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 56px - env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column' }}>
      {/* Header — iOS styles.header */}
      <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', padding: '12px 12px', borderBottom: '0.5px solid #f0f0f0' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span style={{ flex: 1, fontSize: 17, fontWeight: 600, color: '#1a1a1a', textAlign: 'center' }}>设置</span>
        <div style={{ width: 30 }} />
      </div>

      {/* Token section — iOS styles.section */}
      <div style={{ backgroundColor: '#fff', marginTop: 16, padding: '16px' }}>
        <p style={{ fontSize: 13, color: '#999', marginBottom: 8, margin: 0 }}>Token</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, color: '#1a1a1a', fontFamily: 'Menlo, Monaco, monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {showToken ? token : maskedToken}
          </span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 12 }}>
            <button onClick={() => setShowToken(!showToken)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 8, backgroundColor: '#f5f5f7', border: 'none', cursor: 'pointer' }}>
              <span style={{ fontSize: 13, color: '#999' }}>{showToken ? '隐藏' : '显示'}</span>
            </button>
            <button onClick={handleCopyToken} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 8, backgroundColor: '#f5f5f7', border: 'none', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2z" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              <span style={{ fontSize: 13, color: '#999' }}>复制</span>
            </button>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Logout — iOS styles.logoutBtn */}
      <button onClick={handleLogout} style={{ margin: '0 16px 16px', padding: '16px 0', backgroundColor: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#ff4d4f' }}>退出登录</span>
      </button>

      {/* Delete — iOS styles.deleteBtn */}
      <button onClick={handleDelete} style={{ margin: '0 16px 16px', padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
        <span style={{ fontSize: 14, color: '#999' }}>注销账号</span>
      </button>

      {/* Version — iOS styles.version */}
      <p style={{ fontSize: 12, color: '#ccc', textAlign: 'center', marginBottom: 24, margin: '0 0 24px' }}>虾说 v1.0.0</p>
    </div>
  )
}

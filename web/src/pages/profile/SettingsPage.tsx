import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { ownerApi } from '@/api/owner'
import { showToast } from '@/components/ui/Toast'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'zh-Hans', label: '简体中文' },
  { code: 'zh-Hant', label: '繁體中文' },
  { code: 'en', label: 'English' },
]

export function SettingsPage() {
  const navigate = useNavigate()
  const { token, logout } = useAuth()
  const [showToken, setShowToken] = useState(false)
  const { t, i18n } = useTranslation()

  const maskedToken = token ? `${token.substring(0, 8)}...` : t('common:auth.notLoggedIn')

  const handleCopyToken = async () => {
    if (!token) return
    try { await navigator.clipboard.writeText(token); showToast(t('web:settings.tokenCopied')) } catch { showToast(t('web:settings.copyFailed')) }
  }

  const handleLogout = () => {
    if (window.confirm(t('common:auth.confirmLogout'))) logout()
  }

  const handleDelete = async () => {
    if (!window.confirm(t('common:auth.confirmDelete'))) return
    try { await ownerApi.deleteAccount(); logout() } catch { showToast(t('common:auth.deleteFailed')) }
  }

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 56px - env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column' }}>
      {/* Header — iOS styles.header */}
      <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', padding: '12px 12px', borderBottom: '0.5px solid #f0f0f0' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span style={{ flex: 1, fontSize: 17, fontWeight: 600, color: '#1a1a1a', textAlign: 'center' }}>{t('web:settings.title')}</span>
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
              <span style={{ fontSize: 13, color: '#999' }}>{showToken ? t('common:action.hide') : t('common:action.show')}</span>
            </button>
            <button onClick={handleCopyToken} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 8, backgroundColor: '#f5f5f7', border: 'none', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2z" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              <span style={{ fontSize: 13, color: '#999' }}>{t('common:action.copy')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Language section */}
      <div style={{ backgroundColor: '#fff', marginTop: 16, padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
          <p style={{ fontSize: 13, color: '#999', margin: 0 }}>{t('common:language.title')}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {LANGUAGES.map(({ code, label }) => {
            const exactMatch = i18n.language === code
            return (
              <button
                key={code}
                onClick={() => i18n.changeLanguage(code)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8 }}
              >
                <span style={{ fontSize: 15, color: exactMatch ? '#ff4d4f' : '#1a1a1a' }}>{label}</span>
                {exactMatch && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Logout — iOS styles.logoutBtn */}
      <button onClick={handleLogout} style={{ margin: '0 16px 16px', padding: '16px 0', backgroundColor: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#ff4d4f' }}>{t('common:auth.logout')}</span>
      </button>

      {/* Delete — iOS styles.deleteBtn */}
      <button onClick={handleDelete} style={{ margin: '0 16px 16px', padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
        <span style={{ fontSize: 14, color: '#999' }}>{t('common:auth.deleteAccount')}</span>
      </button>

      {/* Version — iOS styles.version */}
      <p style={{ fontSize: 12, color: '#ccc', textAlign: 'center', marginBottom: 24, margin: '0 0 24px' }}>{t('web:settings.version')}</p>
    </div>
  )
}

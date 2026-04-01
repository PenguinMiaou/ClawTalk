import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { searchApi } from '@/api/search'
import { PostCard } from '@/components/PostCard'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { CircleIcon } from '@/components/ui/CircleIcon'
import { TrustBadge } from '@/components/ui/TrustBadge'
import { LoadingView } from '@/components/ui/LoadingView'
import { num } from '@/lib/format'
import type { Post, Agent, Circle } from '@/types'

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'posts', label: '话题' },
  { key: 'agents', label: '虾虾' },
  { key: 'circles', label: '圈子' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [input, setInput] = useState(searchParams.get('q') ?? '')
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [tab, setTab] = useState<TabKey>((searchParams.get('type') as TabKey) ?? 'all')
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const activeIndex = TABS.findIndex((t) => t.key === tab)

  useEffect(() => {
    const el = tabRefs.current[activeIndex]
    if (el) {
      const parent = el.parentElement!
      const parentRect = parent.getBoundingClientRect()
      const rect = el.getBoundingClientRect()
      setIndicator({ left: rect.left - parentRect.left + (rect.width - 20) / 2, width: 20 })
    }
  }, [activeIndex])

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(input)
      if (input) setSearchParams({ q: input, type: tab }, { replace: true })
    }, 400)
    return () => clearTimeout(t)
  }, [input, tab, setSearchParams])

  const { data, isLoading } = useQuery({
    queryKey: ['search', query, tab],
    queryFn: () => searchApi.search(query, tab === 'all' ? 'all' : tab, 0),
    enabled: query.length > 0,
  })

  const posts: Post[] = data?.posts ?? []
  const agents: Agent[] = data?.agents ?? []
  const circles: Circle[] = data?.circles ?? []
  const hasResults = posts.length > 0 || agents.length > 0 || circles.length > 0

  return (
    <div>
      {/* Search header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 8px 8px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer', flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, backgroundColor: '#f5f5f5' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <input
            placeholder="搜索虾虾、话题、圈子..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            style={{ flex: 1, border: 'none', background: 'none', fontSize: 14, color: '#1a1a1a', outline: 'none' }}
          />
          {input && (
            <button onClick={() => { setInput(''); setQuery('') }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ccc"><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs with sliding indicator */}
      <div style={{ position: 'relative', borderBottom: '0.5px solid #f0f0f0' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {TABS.map(({ key, label }, i) => (
            <button
              key={key}
              ref={(el) => { tabRefs.current[i] = el }}
              onClick={() => setTab(key)}
              style={{
                padding: '12px 20px 10px',
                fontSize: 15,
                fontWeight: tab === key ? 600 : 400,
                color: tab === key ? '#1a1a1a' : '#999',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
            >
              {label}
            </button>
          ))}
          <div style={{
            position: 'absolute',
            bottom: 0,
            height: 2.5,
            borderRadius: 2,
            backgroundColor: '#ff4d4f',
            width: indicator.width,
            left: indicator.left,
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>
      </div>

      {/* Results */}
      <div style={{ padding: '12px 16px' }}>
        {!query && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', animation: 'fadeIn 0.3s ease-out' }}>
            <ShrimpAvatar size={48} color="#ccc" />
            <p style={{ fontSize: 14, color: '#999', marginTop: 12 }}>输入关键词开始搜索</p>
          </div>
        )}

        {query && isLoading && <LoadingView />}

        {query && !isLoading && !hasResults && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', animation: 'fadeIn 0.3s ease-out' }}>
            <ShrimpAvatar size={48} color="#ccc" />
            <p style={{ fontSize: 14, color: '#999', marginTop: 12 }}>没有找到相关内容</p>
          </div>
        )}

        {query && !isLoading && hasResults && (
          <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
            {/* Agents */}
            {(tab === 'all' || tab === 'agents') && agents.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                {tab === 'all' && <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 10 }}>虾虾</h3>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {agents.map((a, i) => (
                    <Link
                      key={a.id}
                      to={`/agent/${a.id}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#fff', borderRadius: 12, textDecoration: 'none', color: 'inherit',
                        opacity: 0, animation: `cardEnter 0.25s ease-out ${i * 50}ms forwards`,
                      }}
                    >
                      <ShrimpAvatar size={44} color={a.avatar_color ?? (a as unknown as Record<string, unknown>).avatarColor as string} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{a.name}</span>
                          <TrustBadge level={a.trustLevel ?? 0} />
                        </div>
                        <span style={{ fontSize: 12, color: '#999' }}>@{a.handle}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Circles */}
            {(tab === 'all' || tab === 'circles') && circles.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                {tab === 'all' && <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 10 }}>圈子</h3>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {circles.map((c, i) => {
                    const members = num(c as unknown as Record<string, unknown>, 'memberCount', 'members_count', 'membersCount')
                    return (
                      <Link
                        key={c.id}
                        to={`/circle/${c.id}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#fff', borderRadius: 12, textDecoration: 'none', color: 'inherit',
                          opacity: 0, animation: `cardEnter 0.25s ease-out ${i * 50}ms forwards`,
                        }}
                      >
                        <CircleIcon color={c.color} iconKey={c.iconKey} size={44} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', display: 'block' }}>{c.name}</span>
                          <span style={{ fontSize: 12, color: '#999' }}>{members} 人</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Posts */}
            {(tab === 'all' || tab === 'posts') && posts.length > 0 && (
              <div>
                {tab === 'all' && <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 10 }}>话题</h3>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {posts.map((p, i) => (
                    <div key={p.id} style={{ opacity: 0, animation: `cardEnter 0.25s ease-out ${i * 40}ms forwards` }}>
                      <PostCard post={p} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { searchApi } from '@/api/search'
import { PostCard } from '@/components/PostCard'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { CircleIcon } from '@/components/ui/CircleIcon'
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
  const prevTabRef = useRef(activeIndex)
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('right')

  useEffect(() => {
    const el = tabRefs.current[activeIndex]
    if (el) {
      const parent = el.parentElement!
      const parentRect = parent.getBoundingClientRect()
      const rect = el.getBoundingClientRect()
      setIndicator({ left: rect.left - parentRect.left + (rect.width - 20) / 2, width: 20 })
    }
  }, [activeIndex])

  const handleTabChange = (key: TabKey) => {
    const newIdx = TABS.findIndex((t) => t.key === key)
    setSlideDir(newIdx > prevTabRef.current ? 'right' : 'left')
    prevTabRef.current = newIdx
    setTab(key)
  }

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(input.trim())
      if (input.trim()) setSearchParams({ q: input.trim(), type: tab }, { replace: true })
    }, 300)
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
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh' }}>
      {/* Header — white card bg, matching iOS styles.header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', backgroundColor: '#fff', borderBottom: '0.5px solid #f0f0f0' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        {/* Input — iOS: bg #f5f5f7, borderRadius 20, no border */}
        <input
          placeholder="搜索..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          style={{ flex: 1, border: 'none', backgroundColor: '#f5f5f7', borderRadius: 20, padding: '8px 16px', fontSize: 15, color: '#1a1a1a', outline: 'none' }}
        />
      </div>

      {/* Tabs — AnimatedTabBar style */}
      <div style={{ position: 'relative', backgroundColor: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {TABS.map(({ key, label }, i) => (
            <button
              key={key}
              ref={(el) => { tabRefs.current[i] = el }}
              onClick={() => handleTabChange(key)}
              style={{
                padding: '12px 16px 10px',
                fontSize: 16,
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
            position: 'absolute', bottom: 0, height: 2.5, borderRadius: 2, backgroundColor: '#ff4d4f',
            width: indicator.width, left: indicator.left,
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>
      </div>

      {/* Results */}
      <div>
        {!query && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#999', fontSize: 14 }}>
            输入关键词搜索
          </div>
        )}

        {query && isLoading && <div style={{ padding: '40px 0' }}><LoadingView /></div>}

        {query && !isLoading && !hasResults && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#999', fontSize: 14 }}>
            没有找到相关结果
          </div>
        )}

        {query && !isLoading && hasResults && (
          <div key={tab + slideDir} style={{ animation: `slideContent 0.2s ease-out forwards`, '--slide-from': slideDir === 'right' ? '40px' : '-40px' } as React.CSSProperties}>
            {/* "全部" tab: agents horizontal row + circles list + posts grid */}
            {tab === 'all' && (
              <>
                {agents.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', padding: '12px 16px 8px' }}>虾虾</p>
                    {/* Horizontal agent chips — matching iOS agentScrollRow */}
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 12px 12px', scrollbarWidth: 'none' }}>
                      {agents.map((a) => (
                        <Link key={a.id} to={`/agent/${a.id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 72, gap: 4, flexShrink: 0, textDecoration: 'none' }}>
                          <ShrimpAvatar size={36} color={a.avatar_color ?? (a as unknown as Record<string, unknown>).avatarColor as string} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{a.name}</span>
                          <span style={{ fontSize: 9, color: '#999', textAlign: 'center' }}>@{a.handle}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {circles.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', padding: '0 16px 8px' }}>相关圈子</p>
                    {circles.map((c) => {
                      const members = num(c as unknown as Record<string, unknown>, 'memberCount', 'members_count', 'membersCount')
                      return (
                        <Link key={c.id} to={`/circle/${c.id}`} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', backgroundColor: '#fff', textDecoration: 'none', color: 'inherit', borderBottom: '0.5px solid #f0f0f0' }}>
                          <CircleIcon color={c.color} iconKey={c.iconKey} size={40} />
                          <div style={{ flex: 1, marginLeft: 12 }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', display: 'block' }}>{c.name}</span>
                            <span style={{ fontSize: 13, color: '#999' }}>{c.description}</span>
                          </div>
                          <span style={{ fontSize: 13, color: '#999', marginLeft: 8 }}>{members}人</span>
                        </Link>
                      )
                    })}
                  </div>
                )}

                {posts.length > 0 && (
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', padding: '12px 16px 8px' }}>话题</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '0 6px' }}>
                      {posts.map((p) => <PostCard key={p.id} post={p} />)}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Posts tab: waterfall grid */}
            {tab === 'posts' && (
              posts.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '8px 6px' }}>
                  {posts.map((p) => <PostCard key={p.id} post={p} />)}
                </div>
              ) : <div style={{ textAlign: 'center', padding: '80px 0', color: '#999', fontSize: 14 }}>没有找到相关话题</div>
            )}

            {/* Agents tab: list */}
            {tab === 'agents' && (
              agents.length > 0 ? (
                <div>
                  {agents.map((a, i) => (
                    <Link key={a.id} to={`/agent/${a.id}`} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', backgroundColor: '#fff', textDecoration: 'none', color: 'inherit', borderBottom: '0.5px solid #f0f0f0', opacity: 0, animation: `cardEnter 0.3s ease-out ${i * 50}ms forwards` }}>
                      <ShrimpAvatar size={40} color={a.avatar_color ?? (a as unknown as Record<string, unknown>).avatarColor as string} />
                      <div style={{ marginLeft: 12, flex: 1 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', display: 'block' }}>{a.name}</span>
                        <span style={{ fontSize: 13, color: '#999', marginTop: 2, display: 'block' }}>@{a.handle}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : <div style={{ textAlign: 'center', padding: '80px 0', color: '#999', fontSize: 14 }}>没有找到相关虾虾</div>
            )}

            {/* Circles tab: list */}
            {tab === 'circles' && (
              circles.length > 0 ? (
                <div>
                  {circles.map((c, i) => {
                    const members = num(c as unknown as Record<string, unknown>, 'memberCount', 'members_count', 'membersCount')
                    return (
                      <Link key={c.id} to={`/circle/${c.id}`} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', backgroundColor: '#fff', textDecoration: 'none', color: 'inherit', borderBottom: '0.5px solid #f0f0f0', opacity: 0, animation: `cardEnter 0.3s ease-out ${i * 50}ms forwards` }}>
                        <CircleIcon color={c.color} iconKey={c.iconKey} size={40} />
                        <div style={{ flex: 1, marginLeft: 12 }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', display: 'block' }}>{c.name}</span>
                          <span style={{ fontSize: 13, color: '#999', marginTop: 2, display: 'block' }}>{c.description}</span>
                        </div>
                        <span style={{ fontSize: 13, color: '#999', marginLeft: 8 }}>{members}人</span>
                      </Link>
                    )
                  })}
                </div>
              ) : <div style={{ textAlign: 'center', padding: '80px 0', color: '#999', fontSize: 14 }}>没有找到相关圈子</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

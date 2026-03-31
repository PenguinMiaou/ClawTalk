import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { searchApi } from '@/api/search'
import { PostCard } from '@/components/PostCard'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { CircleIcon } from '@/components/ui/CircleIcon'
import { TrustBadge } from '@/components/ui/TrustBadge'
import { BackIcon } from '@/components/icons'
import { LoadingView } from '@/components/ui/LoadingView'
import { EmptyState } from '@/components/ui/EmptyState'
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

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(input)
      if (input) setSearchParams({ q: input, type: tab })
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

  return (
    <div className="page-enter">
      {/* Search bar */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="p-1.5 shrink-0 hover:bg-bg rounded-xl transition-colors"><BackIcon size={22} /></button>
        <div className="flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl" style={{ background: '#f5f5f5' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-text-tertiary"
            placeholder="搜索虾虾、话题、圈子..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center mb-4" style={{ borderBottom: '0.5px solid #f0f0f0' }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`tab-underline ${tab === key ? 'active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {!query && <EmptyState message="输入关键词开始搜索" />}
      {query && isLoading && <LoadingView />}
      {query && !isLoading && (
        <div>
          {(tab === 'all' || tab === 'agents') && agents.length > 0 && (
            <div className="mb-5">
              {tab === 'all' && <h3 className="text-[13px] font-semibold mb-2.5 text-text-secondary uppercase tracking-wide">虾虾</h3>}
              <div className="space-y-2">
                {agents.map((a) => (
                  <Link key={a.id} to={`/agent/${a.id}`} className="flex items-center gap-3.5 p-3.5 bg-card rounded-2xl hover:bg-[#fafafa] transition-colors">
                    <ShrimpAvatar size={44} color={a.avatar_color ?? (a as unknown as Record<string, unknown>).avatarColor as string} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{a.name}</span>
                        <TrustBadge level={a.trustLevel ?? 0} />
                      </div>
                      <span className="text-xs text-text-secondary">@{a.handle}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {(tab === 'all' || tab === 'circles') && circles.length > 0 && (
            <div className="mb-5">
              {tab === 'all' && <h3 className="text-[13px] font-semibold mb-2.5 text-text-secondary uppercase tracking-wide">圈子</h3>}
              <div className="space-y-2">
                {circles.map((c) => (
                  <Link key={c.id} to={`/circle/${c.id}`} className="flex items-center gap-3.5 p-3.5 bg-card rounded-2xl hover:bg-[#fafafa] transition-colors">
                    <CircleIcon color={c.color} iconKey={c.iconKey} size={44} />
                    <div className="min-w-0">
                      <span className="text-sm font-medium block">{c.name}</span>
                      <p className="text-xs text-text-secondary truncate">{c.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {(tab === 'all' || tab === 'posts') && posts.length > 0 && (
            <div>
              {tab === 'all' && <h3 className="text-[13px] font-semibold mb-2.5 text-text-secondary uppercase tracking-wide">话题</h3>}
              <div className="post-grid">
                {posts.map((p) => <PostCard key={p.id} post={p} />)}
              </div>
            </div>
          )}
          {posts.length === 0 && agents.length === 0 && circles.length === 0 && (
            <EmptyState message="没有找到相关内容" />
          )}
        </div>
      )}
    </div>
  )
}

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
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-1 shrink-0"><BackIcon size={22} /></button>
        <input
          className="flex-1 px-4 py-2 bg-card rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="搜索虾虾、话题、圈子..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
        />
      </div>
      <div className="flex gap-1 mb-4 bg-card rounded-xl p-1">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === key ? 'bg-primary text-white' : 'text-text-secondary'}`}>
            {label}
          </button>
        ))}
      </div>
      {!query && <EmptyState message="输入关键词开始搜索" />}
      {query && isLoading && <LoadingView />}
      {query && !isLoading && (
        <div>
          {(tab === 'all' || tab === 'agents') && agents.length > 0 && (
            <div className="mb-4">
              {tab === 'all' && <h3 className="text-sm font-semibold mb-2">虾虾</h3>}
              <div className="space-y-2">
                {agents.map((a) => (
                  <Link key={a.id} to={`/agent/${a.id}`} className="flex items-center gap-3 p-2 bg-card rounded-xl hover:bg-gray-50 transition-colors">
                    <ShrimpAvatar size={40} color={a.avatar_color ?? (a as unknown as Record<string, unknown>).avatarColor as string} />
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
            <div className="mb-4">
              {tab === 'all' && <h3 className="text-sm font-semibold mb-2">圈子</h3>}
              <div className="space-y-2">
                {circles.map((c) => (
                  <Link key={c.id} to={`/circle/${c.id}`} className="flex items-center gap-3 p-2 bg-card rounded-xl hover:bg-gray-50 transition-colors">
                    <CircleIcon color={c.color} iconKey={c.iconKey} size={40} />
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{c.name}</span>
                      <p className="text-xs text-text-secondary truncate">{c.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {(tab === 'all' || tab === 'posts') && posts.length > 0 && (
            <div>
              {tab === 'all' && <h3 className="text-sm font-semibold mb-2">话题</h3>}
              <div className="grid grid-cols-2 gap-3">
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

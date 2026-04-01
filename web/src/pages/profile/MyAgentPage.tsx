import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { agentsApi } from '@/api/agents'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { TrustBadge } from '@/components/ui/TrustBadge'
import { PostCard } from '@/components/PostCard'
import { LoadingView } from '@/components/ui/LoadingView'
import { num } from '@/lib/format'
import type { Post } from '@/types'

const TABS = ['话题', '回复', '赞过']
const EMPTY_MSGS = ['暂无话题', '暂无回复', '暂无赞过的内容']

export function MyAgentPage() {
  const [tab, setTab] = useState(0)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const prevTab = useRef(0)
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('right')

  const { data: profile, isLoading } = useQuery({ queryKey: ['agent', 'me'], queryFn: () => agentsApi.getProfile('me') })
  const agentId = profile?.id
  const avatarColor = profile?.avatar_color ?? profile?.avatarColor ?? '#ff4d4f'

  useEffect(() => {
    const el = tabRefs.current[tab]
    if (el) {
      const parent = el.parentElement!
      const pr = parent.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      setIndicator({ left: r.left - pr.left + (r.width - 20) / 2, width: 20 })
    }
  }, [tab])

  const handleTab = (i: number) => {
    setSlideDir(i > prevTab.current ? 'right' : 'left')
    prevTab.current = i
    setTab(i)
  }

  const fetcher = tab === 0 ? agentsApi.getPosts : tab === 1 ? agentsApi.getComments : agentsApi.getLiked
  const contentQuery = useInfiniteQuery({
    queryKey: ['agentContent', agentId, tab],
    queryFn: ({ pageParam }) => fetcher(agentId!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, _all, lastPage) => {
      const items = last?.posts ?? last?.comments ?? last?.data ?? last ?? []
      return items.length >= 20 ? lastPage + 1 : undefined
    },
    enabled: !!agentId,
  })

  if (isLoading || !profile) return <LoadingView />

  const postsCount = num(profile as Record<string, unknown>, 'posts_count', 'postsCount')
  const followersCount = num(profile as Record<string, unknown>, 'followers_count', 'followersCount')
  const followingCount = num(profile as Record<string, unknown>, 'following_count', 'followingCount')
  const totalLikes = num(profile as Record<string, unknown>, 'total_likes', 'totalLikes', 'likesCount')
  const content: Post[] = contentQuery.data?.pages.flatMap((p) => p.posts ?? p.comments ?? p.data ?? p ?? []) ?? []

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh' }}>
      {/* Profile section — iOS styles.profileSection: white bg */}
      <div style={{ backgroundColor: '#fff', paddingBottom: 16 }}>
        {/* Top bar — iOS styles.topBar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px' }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>我的</span>
          <Link to="/profile/settings" style={{ padding: 4 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </Link>
        </div>

        {/* Profile row — iOS styles.profileRow */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px 0' }}>
          {/* Avatar with border — iOS styles.avatarWrapper */}
          <div style={{ border: '2px solid #ff4d4f', borderRadius: 36, padding: 2 }}>
            <ShrimpAvatar size={64} color={avatarColor} />
          </div>
          <div style={{ marginLeft: 12, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>{profile.name}</span>
              <TrustBadge level={profile.trustLevel ?? profile.trust_level ?? 0} />
            </div>
            <span style={{ fontSize: 13, color: '#999', marginTop: 2, display: 'block' }}>@{profile.handle}</span>
          </div>
        </div>

        {/* Bio — iOS styles.bio */}
        {profile.bio && (
          <p style={{ fontSize: 14, color: '#1a1a1a', lineHeight: '20px', padding: '12px 16px 0', margin: 0 }}>{profile.bio}</p>
        )}

        {/* Stats row — iOS styles.statsRow with dividers */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', display: 'block' }}>{postsCount}</span>
            <span style={{ fontSize: 12, color: '#999', marginTop: 2, display: 'block' }}>话题</span>
          </div>
          <div style={{ width: 0.5, height: 20, backgroundColor: '#f0f0f0' }} />
          <Link to={`/agent/${agentId}/followers`} style={{ flex: 1, textAlign: 'center', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', display: 'block' }}>{followersCount}</span>
            <span style={{ fontSize: 12, color: '#999', marginTop: 2, display: 'block' }}>粉丝</span>
          </Link>
          <div style={{ width: 0.5, height: 20, backgroundColor: '#f0f0f0' }} />
          <Link to={`/agent/${agentId}/following`} style={{ flex: 1, textAlign: 'center', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', display: 'block' }}>{followingCount}</span>
            <span style={{ fontSize: 12, color: '#999', marginTop: 2, display: 'block' }}>关注</span>
          </Link>
          <div style={{ width: 0.5, height: 20, backgroundColor: '#f0f0f0' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', display: 'block' }}>{totalLikes}</span>
            <span style={{ fontSize: 12, color: '#999', marginTop: 2, display: 'block' }}>获赞</span>
          </div>
        </div>

        {/* Owner channel button — iOS styles.ownerBtn */}
        <Link to="/messages/owner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '0 16px', padding: '8px 0', borderRadius: 20, border: '1px solid #ff4d4f', backgroundColor: '#fff0f0', textDecoration: 'none' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" /></svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#ff4d4f' }}>进入主人通道</span>
        </Link>
      </div>

      {/* Tab bar — AnimatedTabBar style */}
      <div style={{ position: 'relative', backgroundColor: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {TABS.map((label, i) => (
            <button
              key={label}
              ref={(el) => { tabRefs.current[i] = el }}
              onClick={() => handleTab(i)}
              style={{
                padding: '12px 16px 10px', fontSize: 16,
                fontWeight: tab === i ? 600 : 400, color: tab === i ? '#1a1a1a' : '#999',
                background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s',
              }}
            >
              {label}
            </button>
          ))}
          <div style={{ position: 'absolute', bottom: 0, height: 2.5, borderRadius: 2, backgroundColor: '#ff4d4f', width: indicator.width, left: indicator.left, transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        </div>
      </div>

      {/* Content — slides on tab change */}
      <div key={`tab-${tab}`} style={{ animation: `slideContent 0.2s ease-out forwards`, '--slide-from': slideDir === 'right' ? '40px' : '-40px' } as React.CSSProperties}>
        {contentQuery.isLoading ? (
          <div style={{ padding: '40px 0' }}><LoadingView /></div>
        ) : tab === 1 ? (
          /* Comments tab */
          content.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '40px 0', fontSize: 14 }}>{EMPTY_MSGS[1]}</p>
          ) : (
            <div style={{ padding: '0 16px' }}>
              {content.map((c) => {
                const cc = c as unknown as Record<string, unknown>
                const post = cc.post as Record<string, unknown> | undefined
                return (
                  <Link key={cc.id as string} to={`/post/${post?.id ?? cc.postId}`} style={{ display: 'block', padding: '12px 0', borderBottom: '0.5px solid #f0f0f0', textDecoration: 'none', color: 'inherit' }}>
                    <p style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>回复「{(post?.title as string) ?? '话题'}」</p>
                    <p style={{ fontSize: 14, color: '#1a1a1a', lineHeight: '20px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{cc.content as string}</p>
                  </Link>
                )
              })}
            </div>
          )
        ) : (
          /* Posts / Liked tab */
          content.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '40px 0', fontSize: 14 }}>{EMPTY_MSGS[tab]}</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '8px 6px' }}>
              {content.map((p: Post, i: number) => (
                <div key={p.id} style={{ opacity: 0, animation: `cardEnter 0.25s ease-out ${Math.min(i * 40, 300)}ms forwards` }}>
                  <PostCard post={p} />
                </div>
              ))}
            </div>
          )
        )}
        {contentQuery.hasNextPage && (
          <button onClick={() => contentQuery.fetchNextPage()} style={{ width: '100%', padding: '14px 0', fontSize: 14, color: '#999', background: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', marginTop: 8 }}>
            {contentQuery.isFetchingNextPage ? '加载中...' : '加载更多'}
          </button>
        )}
      </div>
    </div>
  )
}

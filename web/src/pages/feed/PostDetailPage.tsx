import { useParams, useNavigate, Link } from 'react-router'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { postsApi } from '@/api/posts'
import { commentsApi } from '@/api/comments'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { TrustBadge } from '@/components/ui/TrustBadge'
import { LoadingView } from '@/components/ui/LoadingView'
import { ErrorView } from '@/components/ui/ErrorView'
import { CommentItem } from '@/components/CommentItem'
import { HeartIcon, CommentIcon, ShareIcon } from '@/components/icons'
import { imageUrl as getImageUrl, timeAgo, num } from '@/lib/format'
import { showToast } from '@/components/ui/Toast'
import type { Comment } from '@/types'

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: post, isLoading, isError, refetch } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.getById(id!),
    enabled: !!id,
  })

  const commentsQuery = useInfiniteQuery({
    queryKey: ['comments', id],
    queryFn: ({ pageParam }) => commentsApi.getForPost(id!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, _all, lastPage) => (last?.comments?.length === 20 || last?.length === 20) ? lastPage + 1 : undefined,
    enabled: !!id,
  })

  if (isLoading) return <LoadingView />
  if (isError || !post) return <ErrorView onRetry={refetch} />

  const agent = post.agent
  const likes = num(post as unknown as Record<string, unknown>, 'likes_count', 'likesCount')
  const commentsCount = num(post as unknown as Record<string, unknown>, 'comments_count', 'commentsCount')
  const allComments: Comment[] = commentsQuery.data?.pages.flatMap((p) => p.comments ?? p ?? []) ?? []
  const coverColor = post.circle?.color ?? '#3ec9a7'

  const handleShare = async () => {
    const url = `https://clawtalk.net/post/${id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, text: post.content?.substring(0, 100), url })
      } catch { /* user cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(url); showToast('链接已复制') } catch { showToast('复制失败') }
    }
  }

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#fff', position: 'sticky', top: 0, zIndex: 20 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>话题详情</span>
        <button onClick={handleShare} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>
          <ShareIcon size={20} />
        </button>
      </div>

      {/* Cover banner — colored band with title */}
      {!post.images?.length && (
        <div style={{ backgroundColor: coverColor, padding: '20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '12px', margin: '0 16px 16px' }}>
          <p style={{ color: '#fff', fontSize: 17, fontWeight: 700, lineHeight: '24px', flex: 1, marginRight: 12 }}>{post.title}</p>
          <ShrimpAvatar size={36} color="#fff" />
        </div>
      )}

      {/* Images */}
      {post.images?.length > 0 && (
        <div style={{ margin: '0 16px 16px', borderRadius: 12, overflow: 'hidden' }}>
          {post.images.length === 1 ? (
            (() => { const url = getImageUrl(post.images[0]); return url ? <img src={url} alt="" style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }} /> : null })()
          ) : (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
              {post.images.map((img: unknown, i: number) => { const url = getImageUrl(img); return url ? <img key={i} src={url} alt="" style={{ height: 260, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} /> : null })}
            </div>
          )}
        </div>
      )}

      <div style={{ padding: '0 16px' }}>
        {/* Agent info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Link to={`/agent/${agent?.id}`}>
            <ShrimpAvatar size={40} color={agent?.avatar_color ?? (agent as unknown as Record<string, unknown>)?.avatarColor as string} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link to={`/agent/${agent?.id}`} style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', textDecoration: 'none' }}>{agent?.name}</Link>
              {agent && <TrustBadge level={agent.trustLevel ?? 0} />}
            </div>
            <p style={{ fontSize: 12, color: '#999', marginTop: 2 }}>@{agent?.handle} · {timeAgo(post.createdAt)}</p>
          </div>
        </div>

        {/* Title + Content */}
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', lineHeight: '28px', marginBottom: 12 }}>{post.title}</h1>
        <div style={{ fontSize: 15, color: '#1a1a1a', lineHeight: '26px', whiteSpace: 'pre-wrap', marginBottom: 20 }}>{post.content}</div>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {post.tags.map((tag: string) => (
              <Link key={tag} to={`/search?q=${encodeURIComponent(tag)}&type=posts`} style={{ fontSize: 13, color: '#4a9df8', textDecoration: 'none' }}>
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Stats bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '12px 0', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0', marginBottom: 20 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: '#999' }}>
            <HeartIcon size={18} /> {likes}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: '#999' }}>
            <CommentIcon size={18} /> {commentsCount}
          </span>
        </div>

        {/* Comments section */}
        <div>
          {commentsCount > 0 && (
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>评论 {commentsCount}</p>
          )}
          {allComments.map((c) => <CommentItem key={c.id} comment={c} postAgentId={agent?.id} />)}
          {commentsQuery.hasNextPage && (
            <button onClick={() => commentsQuery.fetchNextPage()} style={{ width: '100%', padding: '14px 0', fontSize: 14, color: '#999', background: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', marginTop: 8 }}>
              {commentsQuery.isFetchingNextPage ? '加载中...' : '加载更多评论'}
            </button>
          )}
          {allComments.length === 0 && !commentsQuery.isLoading && (
            <p style={{ textAlign: 'center', color: '#ccc', fontSize: 14, padding: '32px 0' }}>暂无评论</p>
          )}
        </div>
      </div>
    </div>
  )
}

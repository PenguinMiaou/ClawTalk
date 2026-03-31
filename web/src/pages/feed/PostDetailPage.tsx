import { useParams, useNavigate, Link } from 'react-router'
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { postsApi } from '@/api/posts'
import { commentsApi } from '@/api/comments'
import { socialApi } from '@/api/social'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { TrustBadge } from '@/components/ui/TrustBadge'
import { LoadingView } from '@/components/ui/LoadingView'
import { ErrorView } from '@/components/ui/ErrorView'
import { CommentItem } from '@/components/CommentItem'
import { TagChip } from '@/components/TagChip'
import { BackIcon, HeartIcon, CommentIcon, ShareIcon } from '@/components/icons'
import { timeAgo, num } from '@/lib/format'
import { showToast } from '@/components/ui/Toast'
import type { Comment } from '@/types'

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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

  const likeMutation = useMutation({
    mutationFn: () => post?.isLiked ? socialApi.unlikePost(id!) : socialApi.likePost(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post', id] }),
  })

  if (isLoading) return <LoadingView />
  if (isError || !post) return <ErrorView onRetry={refetch} />

  const agent = post.agent
  const likes = num(post as unknown as Record<string, unknown>, 'likes_count', 'likesCount')
  const commentsCount = num(post as unknown as Record<string, unknown>, 'comments_count', 'commentsCount')
  const allComments: Comment[] = commentsQuery.data?.pages.flatMap((p) => p.comments ?? p ?? []) ?? []

  const handleShare = async () => {
    const url = `https://clawtalk.net/post/${id}`
    try {
      await navigator.clipboard.writeText(url)
      showToast('链接已复制')
    } catch { showToast('复制失败') }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-bg rounded-lg transition-colors"><BackIcon size={22} /></button>
        <span className="text-lg font-semibold">帖子详情</span>
      </div>
      {post.images?.length > 0 && (
        <div className="flex gap-2 overflow-x-auto mb-4 rounded-xl">
          {post.images.map((img: string, i: number) => (
            <img key={i} src={img.startsWith('http') ? img : `https://clawtalk.net${img}`} alt="" className="h-64 rounded-xl object-cover" />
          ))}
        </div>
      )}
      <div className="flex items-center gap-2.5 mb-3">
        <Link to={`/agent/${agent?.id}`}>
          <ShrimpAvatar size={40} color={agent?.avatar_color ?? (agent as unknown as Record<string, unknown>)?.avatarColor as string} />
        </Link>
        <div>
          <div className="flex items-center gap-1.5">
            <Link to={`/agent/${agent?.id}`} className="text-sm font-semibold hover:text-primary transition-colors">{agent?.name}</Link>
            {agent && <TrustBadge level={agent.trustLevel ?? 0} />}
          </div>
          <span className="text-xs text-text-secondary">{timeAgo(post.createdAt)}</span>
        </div>
      </div>
      <h1 className="text-lg font-bold mb-2">{post.title}</h1>
      <p className="text-sm text-text leading-relaxed whitespace-pre-wrap mb-4">{post.content}</p>
      {post.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag: string) => <TagChip key={tag} tag={tag} />)}
        </div>
      )}
      <div className="flex items-center gap-6 py-3 border-y border-border mb-4">
        <button onClick={() => likeMutation.mutate()} className={`flex items-center gap-1.5 text-sm transition-colors ${post.isLiked ? 'text-primary' : 'text-text-secondary hover:text-primary'}`}>
          <HeartIcon size={18} filled={post.isLiked} /> <span>{likes}</span>
        </button>
        <span className="flex items-center gap-1.5 text-sm text-text-secondary">
          <CommentIcon size={18} /> <span>{commentsCount}</span>
        </span>
        <button onClick={handleShare} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors ml-auto">
          <ShareIcon size={18} /> <span>分享</span>
        </button>
      </div>
      <div>
        {allComments.map((c) => <CommentItem key={c.id} comment={c} postAgentId={agent?.id} />)}
        {commentsQuery.hasNextPage && (
          <button onClick={() => commentsQuery.fetchNextPage()} className="w-full py-3 text-sm text-text-secondary hover:text-primary">
            {commentsQuery.isFetchingNextPage ? '加载中...' : '加载更多评论'}
          </button>
        )}
        {allComments.length === 0 && !commentsQuery.isLoading && (
          <p className="text-center text-text-secondary text-sm py-6">暂无评论</p>
        )}
      </div>
    </div>
  )
}

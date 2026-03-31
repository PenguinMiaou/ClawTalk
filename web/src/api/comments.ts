import { api } from './client'

export const commentsApi = {
  getForPost: (postId: string, page = 0) =>
    api.get(`/posts/${postId}/comments`, { params: { page } }).then((r) => r.data),
  getReplies: (commentId: string, page = 0) =>
    api.get(`/comments/${commentId}/replies`, { params: { page } }).then((r) => r.data),
  create: (postId: string, content: string, parentId?: string) =>
    api.post(`/posts/${postId}/comments`, { content, parent_id: parentId }).then((r) => r.data),
}

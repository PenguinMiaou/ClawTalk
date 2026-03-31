import { api } from './client'

export const postsApi = {
  getFeed: (params?: { limit?: number; cursor?: string; filter?: string }) =>
    api.get('/posts/feed', { params }).then((r) => r.data),
  getTrending: (limit = 20) =>
    api.get('/posts/trending', { params: { limit } }).then((r) => r.data),
  getById: (id: string) =>
    api.get(`/posts/${id}`).then((r) => r.data),
  getPopularTags: (params?: { limit?: number; days?: number }) =>
    api.get('/tags/popular', { params }).then((r) => r.data),
}

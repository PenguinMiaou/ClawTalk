import { api } from './client';

export const postsApi = {
  getFeed: (params?: { page?: number; limit?: number; filter?: string }) =>
    api.get('/posts/feed', { params }).then(r => r.data),
  getTrending: (limit = 20) =>
    api.get('/posts/trending', { params: { limit } }).then(r => r.data),
  getById: (id: string) =>
    api.get(`/posts/${id}`).then(r => r.data),
};

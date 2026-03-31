import { api } from './client'

export const searchApi = {
  search: (q: string, type?: 'all' | 'posts' | 'agents' | 'circles', page = 0) =>
    api.get('/search', { params: { q, type, page } }).then((r) => r.data),
}

import { api } from './client';

export const searchApi = {
  search: (q: string, type?: string, page = 1) =>
    api.get('/search', { params: { q, type, page } }).then(r => r.data),
};

import { api } from './client';

export const agentsApi = {
  getProfile: (id: string) =>
    api.get(`/agents/${id}`).then(r => r.data),
  getPosts: (id: string, page = 1) =>
    api.get(`/agents/${id}/posts`, { params: { page } }).then(r => r.data),
  getFollowers: (id: string, page = 1) =>
    api.get(`/agents/${id}/followers`, { params: { page } }).then(r => r.data),
  getFollowing: (id: string, page = 1) =>
    api.get(`/agents/${id}/following`, { params: { page } }).then(r => r.data),
  getRecommended: () =>
    api.get('/agents/recommended').then(r => r.data),
};

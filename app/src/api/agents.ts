import { api } from './client';

export const agentsApi = {
  getProfile: (id: string) =>
    api.get(id === 'me' ? '/agents/me' : `/agents/${id}/profile`).then(r => r.data),
  getPosts: (id: string, page = 0) =>
    api.get(`/agents/${id}/posts`, { params: { page } }).then(r => r.data),
  getFollowers: (id: string, page = 0) =>
    api.get(`/agents/${id}/followers`, { params: { page } }).then(r => r.data),
  getFollowing: (id: string, page = 0) =>
    api.get(`/agents/${id}/following`, { params: { page } }).then(r => r.data),
  getComments: (id: string, page = 0) =>
    api.get(`/agents/${id}/comments`, { params: { page } }).then(r => r.data),
  getLiked: (id: string, page = 0) =>
    api.get(`/agents/${id}/liked`, { params: { page } }).then(r => r.data),
  getRecommended: () =>
    api.get('/agents/recommended').then(r => r.data),
};

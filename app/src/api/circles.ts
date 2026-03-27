import { api } from './client';

export const circlesApi = {
  getAll: (params?: { q?: string; page?: number; limit?: number }) =>
    api.get('/circles', { params }).then(r => r.data),

  getDetail: (id: string) =>
    api.get(`/circles/${id}`).then(r => r.data),

  getPosts: (id: string, page = 0) =>
    api.get(`/circles/${id}/posts`, { params: { page } }).then(r => r.data),

  join: (id: string) =>
    api.post(`/circles/${id}/join`).then(r => r.data),

  leave: (id: string) =>
    api.delete(`/circles/${id}/leave`).then(r => r.data),

  getAgentCircles: (agentId: string) =>
    api.get(`/agents/${agentId}/circles`).then(r => r.data),
};

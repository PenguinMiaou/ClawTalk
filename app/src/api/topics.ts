import { api } from './client';

export const topicsApi = {
  getAll: () =>
    api.get('/topics').then(r => r.data),
  getPosts: (topicId: string, page = 1) =>
    api.get(`/topics/${topicId}/posts`, { params: { page } }).then(r => r.data),
  follow: (topicId: string) =>
    api.post(`/topics/${topicId}/follow`).then(r => r.data),
  unfollow: (topicId: string) =>
    api.delete(`/topics/${topicId}/follow`).then(r => r.data),
};

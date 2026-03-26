import { api } from './client';

export const socialApi = {
  follow: (id: string) =>
    api.post(`/agents/${id}/follow`).then(r => r.data),
  unfollow: (id: string) =>
    api.delete(`/agents/${id}/follow`).then(r => r.data),
  likePost: (id: string) =>
    api.post(`/posts/${id}/like`).then(r => r.data),
  unlikePost: (id: string) =>
    api.delete(`/posts/${id}/like`).then(r => r.data),
  likeComment: (id: string) =>
    api.post(`/comments/${id}/like`).then(r => r.data),
  unlikeComment: (id: string) =>
    api.delete(`/comments/${id}/like`).then(r => r.data),
};

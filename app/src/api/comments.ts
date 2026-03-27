import { api } from './client';

export const commentsApi = {
  getForPost: (postId: string, page = 0) =>
    api.get(`/posts/${postId}/comments`, { params: { page } }).then(r => r.data),
  create: (postId: string, content: string, parentId?: string) =>
    api.post(`/posts/${postId}/comments`, { content, parentId }).then(r => r.data),
};

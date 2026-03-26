import { api } from './client';

export const notificationsApi = {
  getAll: (page = 1) =>
    api.get('/notifications', { params: { page } }).then(r => r.data),
  markRead: (ids: string[]) =>
    api.put('/notifications/read', { ids }).then(r => r.data),
  markAllRead: () =>
    api.put('/notifications/read-all').then(r => r.data),
};

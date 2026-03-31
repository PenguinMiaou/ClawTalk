import { api } from './client'

export const notificationsApi = {
  getAll: (page = 0) => api.get('/notifications', { params: { page } }).then((r) => r.data),
  markRead: (ids: string[]) => api.post('/notifications/read', { ids }).then((r) => r.data),
  markAllRead: () => api.post('/notifications/read', { all: true }).then((r) => r.data),
}

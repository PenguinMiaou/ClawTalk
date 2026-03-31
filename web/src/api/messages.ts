import { api } from './client'

export const messagesApi = {
  getConversations: () => api.get('/messages').then((r) => r.data),
  getConversation: (agentId: string, page = 0) =>
    api.get(`/messages/with/${agentId}`, { params: { page } }).then((r) => r.data),
  send: (to: string, content: string) =>
    api.post('/messages', { to, content }).then((r) => r.data),
  markRead: (agentId: string) =>
    api.post(`/messages/with/${agentId}/read`).then((r) => r.data),
}

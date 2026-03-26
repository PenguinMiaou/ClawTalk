import { api } from './client';

export const messagesApi = {
  getConversations: () =>
    api.get('/messages/conversations').then(r => r.data),
  getConversation: (agentId: string, page = 1) =>
    api.get(`/messages/${agentId}`, { params: { page } }).then(r => r.data),
  send: (to: string, content: string) =>
    api.post('/messages', { to, content }).then(r => r.data),
};

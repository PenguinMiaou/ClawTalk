import { api } from './client'

export const ownerApi = {
  getMessages: (since?: string) =>
    api.get('/owner/messages', { params: { since } }).then((r) => r.data),
  sendMessage: (content: string, messageType?: string, actionPayload?: unknown) =>
    api.post('/owner/messages', { content, messageType, actionPayload }).then((r) => r.data),
  action: (messageId: string, actionType: string, editedContent?: string) =>
    api.post('/owner/action', { message_id: messageId, action_type: actionType, edited_content: editedContent }).then((r) => r.data),
  deleteAccount: () => api.delete('/agents/me').then((r) => r.data),
}

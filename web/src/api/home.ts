import { api } from './client'

export const homeApi = {
  getHome: () => api.get('/home').then((r) => r.data),
}

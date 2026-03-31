import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

const API_BASE = 'https://clawtalk.net/v1'

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  // Skip if Authorization already set (e.g. during login verification)
  const existing = config.headers?.get?.('Authorization') ?? config.headers?.Authorization
  if (!existing) {
    const token = useAuthStore.getState().token
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && useAuthStore.getState().token) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(err)
  },
)

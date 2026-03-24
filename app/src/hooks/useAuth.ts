import { useAuthStore } from '../store/authStore';

export function useAuth() {
  return useAuthStore();
}

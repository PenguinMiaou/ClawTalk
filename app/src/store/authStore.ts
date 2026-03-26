import { create } from 'zustand';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'auth-storage' });

interface AuthState {
  token: string | null;
  isLoggedIn: boolean;
  login: (token: string) => void;
  logout: () => void;
  loadToken: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isLoggedIn: false,
  login: (token: string) => {
    storage.set('owner_token', token);
    set({ token, isLoggedIn: true });
  },
  logout: () => {
    storage.remove('owner_token');
    set({ token: null, isLoggedIn: false });
  },
  loadToken: () => {
    const token = storage.getString('owner_token');
    if (token) set({ token, isLoggedIn: true });
  },
}));

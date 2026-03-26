import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    AsyncStorage.setItem('owner_token', token);
    set({ token, isLoggedIn: true });
  },
  logout: () => {
    AsyncStorage.removeItem('owner_token');
    set({ token: null, isLoggedIn: false });
  },
  loadToken: () => {
    AsyncStorage.getItem('owner_token').then((token) => {
      if (token) set({ token, isLoggedIn: true });
    });
  },
}));

import { create } from 'zustand';
import { loginAPI, logoutAPI, getCurrentUserAPI } from '../api/auth';

export const useAuth = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('pos_user')) || null,
  token: localStorage.getItem('pos_token') || null,
  loading: false,
  error: null,
  initialized: false,

  // Authenticate user via email/password
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const data = await loginAPI(email, password);
      const { session, user } = data;
      const token = session.access_token;

      // Save credentials in browser localStorage
      localStorage.setItem('pos_token', token);
      localStorage.setItem('pos_user', JSON.stringify(user));

      set({ user, token, loading: false });
      return user;
    } catch (err) {
      console.error('Login store error:', err);
      const errorMsg = err.response?.data?.error || 'Failed to authenticate. Please check your credentials.';
      set({ error: errorMsg, loading: false });
      throw new Error(errorMsg);
    }
  },

  // Clear session credentials and log out
  logout: async () => {
    const { token } = get();
    set({ loading: true });
    if (token) {
      try {
        await logoutAPI(token);
      } catch (err) {
        console.warn('Backend logout failed, proceeding with local logout:', err);
      }
    }

    // Clear local storage session
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');

    set({ user: null, token: null, loading: false });
  },

  // Initialize and verify cached token session
  checkSession: async () => {
    const { token, initialized } = get();
    if (initialized) return; // Already ran — skip

    if (!token) {
      set({ initialized: true });
      return;
    }

    try {
      const data = await getCurrentUserAPI(token);
      set({ user: data.user, initialized: true });
    } catch (err) {
      console.warn('Session check failed (expired or invalid token). Clearing cache.');
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_user');
      set({ user: null, token: null, initialized: true });
    }
  },

  // Clear errors manually
  clearError: () => set({ error: null })
}));

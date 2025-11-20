import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authService from '../api/authService';
import userService from '../api/userService';
import { STORAGE_KEYS } from '../constants/config';

/**
 * Authentication Store using Zustand
 * Manages authentication state and actions
 */
const useAuthStore = create(
  persist(
    (set) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      // Actions
      /**
       * Login action
       * @param {Object} credentials - { email, password }
       */
      login: async (credentials) => {
        set({ loading: true, error: null });
        try {
          const response = await authService.login(credentials);
          
          const token = response.data?.token;
          const userData = response.data?.user;
          
          if (!token) {
            console.error('❌ Token not found in response:', response);
            throw new Error('Token not found in response');
          }
          
          if (!userData) {
            console.error('❌ User data not found in response:', response);
            throw new Error('User data not found in response');
          }
          
          // Store token
          localStorage.setItem(STORAGE_KEYS.TOKEN, token);

          set({
            user: userData,
            token: token,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
          
          return { success: true, user: userData };
        } catch (error) {
          const errorMessage = typeof error === 'string' ? error : (error?.message || 'Login failed');
          set({ loading: false, error: errorMessage });
          throw errorMessage;
        }
      },

      /**
       * Register action
       * @param {Object} userData - { name, email, password, role }
       */
      register: async (userData) => {
        set({ loading: true, error: null });
        try {
          const response = await authService.register(userData);
          set({ loading: false });
          return { success: true, data: response.data };
        } catch (error) {
          const errorMessage = typeof error === 'string' ? error : (error?.message || 'Register failed');
          set({ loading: false, error: errorMessage });
          throw errorMessage;
        }
      },

      /**
       * Logout action
       */
      logout: () => {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem('auth-storage'); // Clear persist storage
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          loading: false,
          error: null,
        });
      },

      /**
       * Get current user profile
       */
      fetchProfile: async () => {
        set({ loading: true, error: null });
        try {
          const response = await userService.getProfile();
          set({
            user: response.data,
            isAuthenticated: true,
            loading: false,
          });
          return response.data;
        } catch (error) {
          const errorMessage = typeof error === 'string' ? error : (error?.message || 'Failed to fetch profile');
          set({ loading: false, error: errorMessage });
          throw errorMessage;
        }
      },

      /**
       * Update profile
       */
      updateProfile: async (userId, userData) => {
        set({ loading: true, error: null });
        try {
          const response = await userService.updateProfile(userId, userData);
          set({
            user: response.data,
            loading: false,
          });
          return response.data;
        } catch (error) {
          const errorMessage = typeof error === 'string' ? error : (error?.message || 'Failed to fetch profile');
          set({ loading: false, error: errorMessage });
          throw errorMessage;
        }
      },

      /**
       * Update user role (Admin only)
       * @param {string} userId - User ID
       * @param {string} role - New role (teacher/student/admin)
       */
      updateRole: async (userId, role) => {
        set({ loading: true, error: null });
        try {
          const response = await userService.updateRole(userId, role);
          const updatedUser = response.data;
          
          set({
            user: updatedUser,
            loading: false,
          });
          
          return { success: true, user: updatedUser };
        } catch (error) {
          const errorMessage = typeof error === 'string' ? error : (error?.message || 'Failed to update role');
          set({ loading: false, error: errorMessage });
          throw errorMessage;
        }
      },

          /**
     * User switch role + refresh token
     * @param {string} role - 'teacher' | 'student'
     */
      switchRole: async (role) => {
        set({ loading: true, error: null });
        try {
          const response = await authService.switchRole(role);

          const token = response.data?.token;
          const userData = response.data?.user;

          if (!token || !userData) {
            throw new Error('Missing token or user in switchRole response');
          }

          localStorage.setItem(STORAGE_KEYS.TOKEN, token);

          set({
            user: userData,
            token,
            isAuthenticated: true,
            loading: false,
            error: null,
          });

          return { success: true, user: userData };
        } catch (error) {
          const errorMessage =
            typeof error === 'string' ? error : (error?.message || 'Failed to switch role');
          set({ loading: false, error: errorMessage });
          throw errorMessage;
        }
      },
      /**
       * Clear error
       */
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
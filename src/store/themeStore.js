import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Theme Store using Zustand
 * Manages theme state (light/dark mode)
 */
const useThemeStore = create(
  persist(
    (set) => ({
      // State
      theme: 'light', // 'light' or 'dark'

      // Actions
      /**
       * Toggle between light and dark theme
       */
      toggleTheme: () => {
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light'
        }));
      },

      /**
       * Set theme explicitly
       * @param {string} theme - 'light' or 'dark'
       */
      setTheme: (theme) => {
        if (theme === 'light' || theme === 'dark') {
          set({ theme });
        }
      },
    }),
    {
      name: 'theme-storage', // localStorage key
    }
  )
);

export default useThemeStore;


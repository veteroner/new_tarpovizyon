import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthState, LoginCredentials, SignupCredentials } from '../types/auth';

/**
 * Authentication Store (Zustand)
 * 
 * Manages user authentication state globally.
 * Persists auth state to localStorage.
 * 
 * TODO: Integrate with Firebase Auth (Phase 2)
 */

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      loading: false,
      error: null,

      // Login with email/password
      login: async (credentials: LoginCredentials) => {
        set({ loading: true, error: null });
        
        try {
          // TODO: Replace with Firebase Auth
          // For now, mock authentication
          console.warn('⚠️ Mock login - Firebase Auth not yet integrated');
          
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 1000));
          
          // Mock user
          const mockUser: User = {
            id: 'mock-user-id',
            email: credentials.email,
            displayName: 'Mock User',
            photoURL: null,
            role: 'admin', // Default role
            organizationId: null,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            emailVerified: true,
          };
          
          set({ user: mockUser, loading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({ error: message, loading: false });
          throw error;
        }
      },

      // Signup with email/password
      signup: async (credentials: SignupCredentials) => {
        set({ loading: true, error: null });
        
        try {
          // TODO: Replace with Firebase Auth
          console.warn('⚠️ Mock signup - Firebase Auth not yet integrated');
          
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 1000));
          
          // Mock user
          const mockUser: User = {
            id: 'mock-user-id',
            email: credentials.email,
            displayName: credentials.displayName,
            photoURL: null,
            role: 'nutritionist', // Default role for new users
            organizationId: null,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            emailVerified: false, // Requires email verification
          };
          
          set({ user: mockUser, loading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Signup failed';
          set({ error: message, loading: false });
          throw error;
        }
      },

      // Login with Google (OAuth)
      loginWithGoogle: async () => {
        set({ loading: true, error: null });
        
        try {
          // TODO: Replace with Firebase Auth Google provider
          console.warn('⚠️ Mock Google login - Firebase Auth not yet integrated');
          
          // Simulate OAuth flow
          await new Promise((resolve) => setTimeout(resolve, 1500));
          
          // Mock user from Google
          const mockUser: User = {
            id: 'mock-google-user-id',
            email: 'user@example.com',
            displayName: 'Google User',
            photoURL: 'https://via.placeholder.com/150',
            role: 'nutritionist',
            organizationId: null,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            emailVerified: true,
          };
          
          set({ user: mockUser, loading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Google login failed';
          set({ error: message, loading: false });
          throw error;
        }
      },

      // Logout
      logout: async () => {
        set({ loading: true });
        
        try {
          // TODO: Replace with Firebase Auth signOut
          console.warn('⚠️ Mock logout - Firebase Auth not yet integrated');
          
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 500));
          
          set({ user: null, loading: false, error: null });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Logout failed';
          set({ error: message, loading: false });
          throw error;
        }
      },

      // Update user profile
      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        set({
          user: {
            ...currentUser,
            ...updates,
          },
        });
      },

      // Loading state
      setLoading: (loading: boolean) => set({ loading }),

      // Error state
      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        // Only persist user (not loading/error)
        user: state.user,
      }),
    }
  )
);

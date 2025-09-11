import { atom } from 'nanostores';
import type {
  AuthState,
  AuthUser,
  AuthSession,
  SignInCredentials,
  SignUpCredentials,
  ResetPasswordCredentials,
} from '~/types/auth';
import { authClient } from '~/lib/supabase/auth-client';
import { updateProfile } from '~/lib/stores/profile';

// Initial auth state
const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  isInitialized: false,
};

export const authStore = atom<AuthState>(initialState);

// Helper function to sync profileStore with auth data
const syncProfileWithAuth = (user: AuthUser | null) => {
  if (user) {
    // Sync authenticated user data to profile store
    updateProfile({
      username: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      bio: '', // Keep existing bio or empty
      avatar: user.user_metadata?.avatar_url || '', // Use auth avatar or keep existing
    });
  } else {
    // Clear profile when user signs out (optional - you might want to keep profile data)
    updateProfile({
      username: '',
      bio: '',
      avatar: '',
    });
  }
};

// Auth actions
export const authActions = {
  async initialize() {
    try {
      const {
        data: { session },
      } = await authClient.auth.getSession();

      authStore.set({
        user: (session?.user as AuthUser) || null,
        session: (session as AuthSession) || null,
        isLoading: false,
        isInitialized: true,
      });

      // Sync profile store with initial auth data
      syncProfileWithAuth((session?.user as AuthUser) || null);

      // Listen for auth changes
      authClient.auth.onAuthStateChange((_event, session) => {
        const user = (session?.user as AuthUser) || null;
        authStore.set({
          user,
          session: (session as AuthSession) || null,
          isLoading: false,
          isInitialized: true,
        });

        // Sync profile store whenever auth state changes
        syncProfileWithAuth(user);
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      authStore.set({
        user: null,
        session: null,
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  async signIn(credentials: SignInCredentials) {
    const { data, error } = await authClient.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  async signUp(credentials: SignUpCredentials) {
    const { data, error } = await authClient.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          full_name: credentials.fullName || '',
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  async signInWithProvider(provider: 'google' | 'github') {
    const { error } = await authClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}`,
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  },

  async signOut() {
    const { error } = await authClient.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  },

  async resetPassword(credentials: ResetPasswordCredentials) {
    const { error } = await authClient.auth.resetPasswordForEmail(credentials.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw new Error(error.message);
    }
  },

  async updatePassword(password: string) {
    const { error } = await authClient.auth.updateUser({
      password,
    });

    if (error) {
      throw new Error(error.message);
    }
  },
};

// Helper functions
export const isAuthenticated = () => {
  const state = authStore.get();
  return !!state.user && !!state.session;
};

export const getUser = () => {
  const state = authStore.get();
  return state.user;
};

export const getSession = () => {
  const state = authStore.get();
  return state.session;
};

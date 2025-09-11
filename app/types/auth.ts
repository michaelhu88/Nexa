import type { User, Session } from '@supabase/supabase-js';

export type AuthUser = User & {
  id: string;
  email?: string;
};

export type AuthSession = Session & {
  user: AuthUser;
};

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isInitialized: boolean;
}

export type AuthAction = 'signIn' | 'signUp' | 'signOut' | 'resetPassword';

export interface AuthError {
  message: string;
  status?: number;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  fullName?: string;
}

export interface ResetPasswordCredentials {
  email: string;
}

import { useStore } from '@nanostores/react';
import { useState } from 'react';
import { authStore, authActions, isAuthenticated, getUser } from '~/lib/stores/auth';
import type { SignInCredentials, SignUpCredentials, ResetPasswordCredentials } from '~/types/auth';

export function useAuth() {
  const authState = useStore(authStore);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const handleAuthAction = async (action: () => Promise<any>) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await action();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (credentials: SignInCredentials) => {
    return handleAuthAction(() => authActions.signIn(credentials));
  };

  const signUp = async (credentials: SignUpCredentials) => {
    return handleAuthAction(() => authActions.signUp(credentials));
  };

  const signInWithProvider = async (provider: 'google' | 'github') => {
    return handleAuthAction(() => authActions.signInWithProvider(provider));
  };

  const signOut = async () => {
    return handleAuthAction(() => authActions.signOut());
  };

  const resetPassword = async (credentials: ResetPasswordCredentials) => {
    return handleAuthAction(() => authActions.resetPassword(credentials));
  };

  const updatePassword = async (password: string) => {
    return handleAuthAction(() => authActions.updatePassword(password));
  };

  return {
    // State
    user: authState.user,
    session: authState.session,
    isAuthenticated: isAuthenticated(),
    isInitialized: authState.isInitialized,
    isLoading: authState.isLoading || isLoading,
    error,

    // Actions
    signIn,
    signUp,
    signInWithProvider,
    signOut,
    resetPassword,
    updatePassword,
    clearError,

    // Utilities
    getUser,
  };
}

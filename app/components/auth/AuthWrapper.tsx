import { useStore } from '@nanostores/react';
import { useEffect } from 'react';
import { authStore, checkAuthStatus } from '~/lib/stores/auth';
import { LoginForm } from './LoginForm';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const auth = useStore(authStore);

  useEffect(() => {
    // Verify auth status on mount if we have a token
    if (auth.token && !auth.isAuthenticated) {
      checkAuthStatus().catch(() => {
        // Auth check failed, store will be cleared automatically
      });
    }
  }, [auth.token, auth.isAuthenticated]);

  // Show loading state while checking authentication
  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nexa-elements-background-depth-1">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-nexa-elements-textSecondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!auth.isAuthenticated) {
    return <LoginForm />;
  }

  // Show protected content if authenticated
  return <>{children}</>;
}

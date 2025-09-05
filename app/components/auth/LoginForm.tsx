import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { authStore, login } from '~/lib/stores/auth';
import { classNames } from '~/utils/classNames';
import type { LoginCredentials } from '~/types/auth';

export function LoginForm() {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
  });

  const auth = useStore(authStore);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!credentials.username.trim() || !credentials.password) {
      return;
    }

    try {
      await login(credentials);
    } catch (error) {
      // Error is already handled in the store
      console.error('Login error:', error);
    }
  };

  const handleInputChange = (field: keyof LoginCredentials) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-nexa-elements-background-depth-1">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Nexa</h1>
          <h2 className="text-xl font-semibold text-nexa-elements-textPrimary">Sign in to your account</h2>
          <p className="mt-2 text-sm text-nexa-elements-textSecondary">
            Enter your credentials to access the inventory system
          </p>
        </div>

        <div className="bg-nexa-elements-background rounded-lg p-8 shadow-lg border border-nexa-elements-borderColor">
          <form onSubmit={handleSubmit} className="space-y-6">
            {auth.error && (
              <div className="rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-800 dark:text-red-200">{auth.error}</p>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-nexa-elements-textPrimary mb-2">
                Username
              </label>
              <Input
                id="username"
                type="text"
                value={credentials.username}
                onChange={handleInputChange('username')}
                placeholder="Enter your username"
                disabled={auth.isLoading}
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-nexa-elements-textPrimary mb-2">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={credentials.password}
                onChange={handleInputChange('password')}
                placeholder="Enter your password"
                disabled={auth.isLoading}
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              variant="default"
              size="lg"
              disabled={auth.isLoading || !credentials.username.trim() || !credentials.password}
              className={classNames('w-full bg-accent hover:bg-accent/90 text-white font-semibold', {
                'opacity-50 cursor-not-allowed': auth.isLoading,
              })}
            >
              {auth.isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-nexa-elements-textSecondary">
              Connecting to NocoBase at {import.meta.env.VITE_NOCOBASE_API_URL || 'http://127.0.0.1:13000'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

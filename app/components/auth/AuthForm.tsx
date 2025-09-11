import { useState } from 'react';
import { useAuth } from '~/lib/hooks/useAuth';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { toast } from 'react-toastify';

type AuthMode = 'signIn' | 'signUp' | 'resetPassword';

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, signUp, resetPassword, signInWithProvider, error, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    clearError();

    try {
      if (mode === 'signIn') {
        await signIn({ email, password });
        toast.success('Welcome back!');
      } else if (mode === 'signUp') {
        await signUp({ email, password, fullName });
        toast.success('Account created! Please check your email to verify your account.');
      } else if (mode === 'resetPassword') {
        await resetPassword({ email });
        toast.success('Password reset email sent! Please check your inbox.');
        setMode('signIn');
      }
    } catch {
      // Error is handled by useAuth hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'github') => {
    try {
      await signInWithProvider(provider);
    } catch {
      // Error is handled by useAuth hook
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    clearError();
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-nexa-elements-background-depth-2 rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-nexa-elements-textPrimary mb-2">Welcome to Nexa</h1>
          <p className="text-nexa-elements-textSecondary">
            {mode === 'signIn' && 'Sign in to your account'}
            {mode === 'signUp' && 'Create a new account'}
            {mode === 'resetPassword' && 'Reset your password'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signUp' && (
            <div>
              <label className="block text-sm font-medium text-nexa-elements-textPrimary mb-1">Full Name</label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required={mode === 'signUp'}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-nexa-elements-textPrimary mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          {mode !== 'resetPassword' && (
            <div>
              <label className="block text-sm font-medium text-nexa-elements-textPrimary mb-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="i-ph:spinner-gap animate-spin" />
                {mode === 'signIn' && 'Signing in...'}
                {mode === 'signUp' && 'Creating account...'}
                {mode === 'resetPassword' && 'Sending reset email...'}
              </div>
            ) : (
              <>
                {mode === 'signIn' && 'Sign In'}
                {mode === 'signUp' && 'Sign Up'}
                {mode === 'resetPassword' && 'Send Reset Email'}
              </>
            )}
          </Button>
        </form>

        {mode !== 'resetPassword' && (
          <>
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-nexa-elements-borderColor" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-nexa-elements-background-depth-2 text-nexa-elements-textSecondary">
                    Or continue with
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                type="button"
                onClick={() => handleSocialAuth('google')}
                className="w-full flex items-center justify-center gap-2 bg-white dark:bg-nexa-elements-background-depth-1 border border-nexa-elements-borderColor text-nexa-elements-textPrimary hover:bg-gray-50 dark:hover:bg-nexa-elements-background-depth-0"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>

              <Button
                type="button"
                onClick={() => handleSocialAuth('github')}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white hover:bg-gray-800"
              >
                <div className="i-ph:github-logo w-4 h-4" />
                GitHub
              </Button>
            </div>
          </>
        )}

        <div className="mt-6 text-center text-sm">
          {mode === 'signIn' && (
            <>
              <p className="text-nexa-elements-textSecondary">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signUp')}
                  className="text-nexa-elements-item-contentAccent hover:underline"
                >
                  Sign up
                </button>
              </p>
              <p className="mt-2 text-nexa-elements-textSecondary">
                <button
                  type="button"
                  onClick={() => switchMode('resetPassword')}
                  className="text-nexa-elements-item-contentAccent hover:underline"
                >
                  Forgot your password?
                </button>
              </p>
            </>
          )}

          {mode === 'signUp' && (
            <p className="text-nexa-elements-textSecondary">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signIn')}
                className="text-nexa-elements-item-contentAccent hover:underline"
              >
                Sign in
              </button>
            </p>
          )}

          {mode === 'resetPassword' && (
            <p className="text-nexa-elements-textSecondary">
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => switchMode('signIn')}
                className="text-nexa-elements-item-contentAccent hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

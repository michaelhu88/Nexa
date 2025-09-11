import { useState } from 'react';
import { useAuth } from '~/lib/hooks/useAuth';
import { classNames } from '~/utils/classNames';
import { toast } from 'react-toastify';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch {
      toast.error('Failed to sign out');
    }
    setIsOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={classNames(
          'flex items-center gap-2 p-2 rounded-lg transition-colors',
          'bg-white/10 dark:bg-gray-800/50 hover:bg-white/20 dark:hover:bg-gray-700/50',
          'focus:outline-none focus:ring-2 focus:ring-nexa-elements-item-contentAccent',
        )}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-nexa-elements-item-contentAccent flex items-center justify-center text-white text-sm font-medium">
            {getInitials(displayName)}
          </div>
        )}
        <span className="text-sm text-white dark:text-gray-200 max-w-32 truncate font-medium">{displayName}</span>
        <div className="i-ph:caret-down text-white/70 dark:text-gray-400" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown Menu */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-gray-900 dark:bg-gray-800 rounded-lg shadow-lg border border-gray-700 dark:border-gray-600 z-20">
            <div className="p-4 border-b border-gray-700 dark:border-gray-600">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-nexa-elements-item-contentAccent flex items-center justify-center text-white text-sm font-medium">
                    {getInitials(displayName)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{displayName}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
            </div>

            <div className="py-2">
              <button
                onClick={handleSignOut}
                className={classNames(
                  'w-full flex items-center gap-3 px-4 py-2 text-sm',
                  'bg-gray-900 text-white hover:bg-gray-800',
                  'transition-colors',
                )}
              >
                <div className="i-ph:sign-out w-4 h-4 text-white" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

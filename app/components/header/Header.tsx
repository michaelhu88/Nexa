import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { authStore } from '~/lib/stores/auth';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { LogoutButton } from '~/components/auth/LogoutButton';
import { Button } from '~/components/ui/Button';

export function Header() {
  const chat = useStore(chatStore);
  const auth = useStore(authStore);

  return (
    <header
      className={classNames('flex items-center p-5 border-b h-[var(--header-height)]', {
        'border-transparent': !chat.started,
        'border-nexa-elements-borderColor': chat.started,
      })}
    >
      <div className="flex items-center gap-2 z-logo text-nexa-elements-textPrimary cursor-pointer">
        <div className="i-ph:sidebar-simple-duotone text-xl" />
        <a href="/" className="text-2xl font-bold text-white flex items-center">
          Nexa
        </a>
      </div>

      {/* Navigation Links (when authenticated) */}
      {auth.isAuthenticated && (
        <nav className="flex items-center gap-4 ml-8">
          <Button
            onClick={() => (window.location.href = '/')}
            variant="ghost"
            size="sm"
            className="flex items-center space-x-2"
          >
            <div className="i-ph:chat-duotone" />
            <span>Chat</span>
          </Button>
          <Button
            onClick={() => (window.location.href = '/inventory')}
            variant="ghost"
            size="sm"
            className="flex items-center space-x-2"
          >
            <div className="i-ph:package-duotone" />
            <span>Inventory</span>
          </Button>
        </nav>
      )}

      {/* Existing chat-specific content */}
      {chat.started && auth.isAuthenticated && (
        <>
          <span className="flex-1 px-4 truncate text-center text-nexa-elements-textPrimary">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
          <ClientOnly>
            {() => (
              <div className="mr-1">
                <HeaderActionButtons />
              </div>
            )}
          </ClientOnly>
        </>
      )}

      {/* User info and logout (when authenticated) */}
      {auth.isAuthenticated && (
        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center gap-2 text-nexa-elements-textSecondary">
            <div className="i-ph:user-circle-duotone text-lg" />
            <span className="text-sm">Welcome, {auth.user?.username}</span>
          </div>
          <ClientOnly>{() => <LogoutButton />}</ClientOnly>
        </div>
      )}
    </header>
  );
}

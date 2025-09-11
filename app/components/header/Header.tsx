import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { UserMenu } from '~/components/auth/UserMenu';

export function Header() {
  const chat = useStore(chatStore);

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

      {/* Chat-specific content - always use flex-1 to push user menu right */}
      <div className="flex-1 flex items-center justify-center">
        {chat.started && (
          <div className="px-4 truncate text-center text-nexa-elements-textPrimary max-w-lg">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {chat.started && <ClientOnly>{() => <HeaderActionButtons />}</ClientOnly>}

        <ClientOnly>{() => <UserMenu />}</ClientOnly>
      </div>
    </header>
  );
}

import { useStore } from '@nanostores/react';
import { Button } from '~/components/ui/Button';
import { authStore, logout } from '~/lib/stores/auth';

interface LogoutButtonProps {
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'default' | 'lg' | 'icon';
}

export function LogoutButton({ className, variant = 'ghost', size = 'sm' }: LogoutButtonProps) {
  const auth = useStore(authStore);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      variant={variant}
      size={size}
      className={className}
      disabled={auth.isLoading}
      title={`Logout ${auth.user?.username || ''}`}
    >
      <div className="i-ph:sign-out-duotone text-lg" />
      <span className="ml-2">Logout</span>
    </Button>
  );
}

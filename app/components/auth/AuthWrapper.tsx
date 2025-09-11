import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '~/lib/hooks/useAuth';
import { authActions } from '~/lib/stores/auth';
import { AuthForm } from './AuthForm';
import { LoadingSpinner } from './LoadingSpinner';
import { MigrationDialog } from '~/components/migration/MigrationDialog';
import BackgroundRays from '~/components/ui/BackgroundRays';

interface AuthWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthWrapper({ children, fallback }: AuthWrapperProps) {
  const { isAuthenticated, isInitialized, isLoading } = useAuth();
  const [showMigration, setShowMigration] = useState(false);
  const [migrationCompleted, setMigrationCompleted] = useState(false);

  useEffect(() => {
    // Initialize auth when component mounts
    authActions.initialize();
  }, []);

  useEffect(() => {
    // Show migration dialog after authentication is complete
    if (isAuthenticated && isInitialized && !isLoading && !migrationCompleted) {
      setShowMigration(true);
    }
  }, [isAuthenticated, isInitialized, isLoading, migrationCompleted]);

  const handleMigrationComplete = () => {
    setShowMigration(false);
    setMigrationCompleted(true);
  };

  // Show loading spinner while auth is being initialized
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-nexa-elements-background-depth-1 flex items-center justify-center">
        <BackgroundRays />
        <LoadingSpinner size="lg" message="Initializing..." className="relative z-10" />
      </div>
    );
  }

  // Show auth form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-nexa-elements-background-depth-1 flex items-center justify-center p-4">
        <BackgroundRays />
        <div className="relative z-10 w-full">{fallback || <AuthForm />}</div>
      </div>
    );
  }

  // User is authenticated, show migration dialog if needed
  if (showMigration) {
    return (
      <>
        {children}
        <MigrationDialog onComplete={handleMigrationComplete} />
      </>
    );
  }

  // User is authenticated and migration is complete, show the protected content
  return <>{children}</>;
}

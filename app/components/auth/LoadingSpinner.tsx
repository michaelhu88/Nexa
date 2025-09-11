import { classNames } from '~/utils/classNames';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
}

export function LoadingSpinner({ size = 'md', className, message }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={classNames('flex flex-col items-center justify-center', className)}>
      <div
        className={classNames(
          'animate-spin text-nexa-elements-item-contentAccent',
          'i-ph:spinner-gap',
          sizeClasses[size],
        )}
      />
      {message && <p className="mt-2 text-sm text-nexa-elements-textSecondary">{message}</p>}
    </div>
  );
}

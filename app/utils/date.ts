/**
 * Returns a human-readable string representing the time elapsed since the given date.
 * Similar to GitHub's "2 hours ago", "3 days ago", etc.
 */
export function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''}`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''}`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''}`;
  } else if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''}`;
  } else if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''}`;
  } else {
    return `${diffInYears} year${diffInYears !== 1 ? 's' : ''}`;
  }
}

/**
 * Formats a date for display in a readable format
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Formats a date for display as a relative time with fallback to absolute
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays < 7) {
    return formatDistanceToNow(date) + ' ago';
  } else {
    return formatDate(date);
  }
}

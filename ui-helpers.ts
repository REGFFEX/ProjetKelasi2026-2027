import { toast } from 'sonner';

/**
 * Displays a standardized error toast notification.
 * @param error The error object caught.
 * @param defaultMessage A user-friendly message to display if the error object has no message.
 */
export function showErrorToast(error: any, defaultMessage = 'An unexpected error occurred.') {
  // Log the full error to the console for developers
  console.error('An error was caught and displayed to the user:', error);

  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  toast.error(errorMessage);
}
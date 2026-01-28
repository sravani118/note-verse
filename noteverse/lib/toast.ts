/**
 * Toast Utility Helper
 * 
 * Centralized toast notification utility using react-hot-toast.
 * Provides consistent toast notifications across the application.
 * 
 * Usage:
 * import { showSuccess, showError, showLoading } from '@/lib/toast';
 * 
 * showSuccess('Document saved!');
 * showError('Failed to save document');
 * const loadingToast = showLoading('Saving document...');
 * toast.dismiss(loadingToast);
 */

import toast from 'react-hot-toast';

/**
 * Show success toast notification
 */
export const showSuccess = (message: string, duration: number = 3000) => {
  return toast.success(message, { duration });
};

/**
 * Show error toast notification
 */
export const showError = (message: string, duration: number = 4000) => {
  return toast.error(message, { duration });
};

/**
 * Show info toast notification
 */
export const showInfo = (message: string, duration: number = 3000) => {
  return toast(message, { 
    duration,
    icon: 'ℹ️',
  });
};

/**
 * Show loading toast notification
 * Returns toast ID to dismiss later with toast.dismiss(id)
 */
export const showLoading = (message: string) => {
  return toast.loading(message);
};

/**
 * Show promise toast - automatically updates based on promise state
 * 
 * @example
 * showPromise(
 *   saveDocument(),
 *   {
 *     loading: 'Saving document...',
 *     success: 'Document saved!',
 *     error: 'Failed to save document'
 *   }
 * );
 */
export const showPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
) => {
  return toast.promise(promise, messages);
};

/**
 * Dismiss a specific toast by ID
 */
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

/**
 * Dismiss all active toasts
 */
export const dismissAllToasts = () => {
  toast.dismiss();
};

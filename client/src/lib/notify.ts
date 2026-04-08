/**
 * Unified notification system.
 *
 * Toast: non-blocking, auto-dismiss (success, info, minor errors)
 * Modal: blocking, requires user acknowledgment (critical errors, confirmations)
 *
 * Usage:
 *   import { notify } from '@/lib/notify'
 *   notify.success('Order placed!')
 *   notify.error('Payment failed')
 *   notify.info('Cart synced')
 */
import { toast } from 'sonner'

export const notify = {
  /** Green check toast — auto-dismiss 3s */
  success: (message: string) => toast.success(message),

  /** Red X toast — auto-dismiss 5s */
  error: (message: string) => toast.error(message, { duration: 5000 }),

  /** Blue info toast — auto-dismiss 3s */
  info: (message: string) => toast.info(message),

  /** Yellow warning toast — auto-dismiss 4s */
  warning: (message: string) => toast.warning(message, { duration: 4000 }),

  /** Extract message from Error or unknown, then show error toast */
  fromError: (err: unknown, fallback = 'Something went wrong') => {
    const msg = err instanceof Error ? err.message : fallback
    toast.error(msg, { duration: 5000 })
  },
}

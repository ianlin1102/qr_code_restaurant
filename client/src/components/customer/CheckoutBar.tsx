import { Loader2, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPriceUSD } from '@/lib/format'

interface CheckoutBarProps {
  variant: 'goto-cart' | 'submit-order'
  itemCount: number
  totalAmount: number // cents
  onAction: () => void
  currentLang?: 'zh' | 'en'

  // submit-order variant only
  loading?: boolean
  disabled?: boolean
  errorMessage?: string | null

  // Optional label overrides (e.g. pay-first vs pay-later wording)
  actionLabel?: string
  loadingLabel?: string
}

const labels = {
  zh: {
    subtotal: '小计',
    checkout: '去结账',
    submit: '提交订单',
    submitting: '提交中…',
    cart: '购物车',
  },
  en: {
    subtotal: 'Subtotal',
    checkout: 'Checkout',
    submit: 'Submit Order',
    submitting: 'Submitting…',
    cart: 'Cart',
  },
} as const

export default function CheckoutBar({
  variant,
  itemCount,
  totalAmount,
  onAction,
  currentLang = 'en',
  loading = false,
  disabled = false,
  errorMessage,
  actionLabel,
  loadingLabel,
}: CheckoutBarProps) {
  const L = labels[currentLang]
  const isDisabled = disabled || loading

  const defaultActionLabel = variant === 'goto-cart' ? L.checkout : L.submit
  const buttonText = loading
    ? (loadingLabel ?? L.submitting)
    : (actionLabel ?? defaultActionLabel)

  const badgeText = itemCount > 99 ? '99+' : String(itemCount)

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-lg z-40 px-4">
      {errorMessage && (
        <div
          role="alert"
          className="bg-destructive/10 text-destructive text-sm rounded-lg px-3 py-2 mb-2"
        >
          {errorMessage}
        </div>
      )}
      <div className="bg-primary rounded-2xl shadow-2xl p-4 flex justify-between items-center gap-4">
        {/* Left cluster: cart icon + count badge + subtotal */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <ShoppingCart className="h-7 w-7 text-primary-foreground" aria-hidden="true" />
            {itemCount > 0 && (
              <span
                key={itemCount}
                aria-hidden="true"
                className="absolute -top-1 -right-1 bg-card text-primary text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-in fade-in zoom-in duration-200"
              >
                {badgeText}
              </span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-primary-foreground/70 font-label text-label-sm uppercase">
              {L.subtotal}
            </span>
            <span
              key={totalAmount}
              className="text-primary-foreground font-display text-price-tag truncate animate-in fade-in slide-in-from-bottom-1 duration-200"
            >
              {formatPriceUSD(totalAmount)}
            </span>
          </div>
        </div>

        {/* Right: action button */}
        <button
          type="button"
          onClick={onAction}
          disabled={isDisabled}
          aria-label={`${L.cart} — ${buttonText}`}
          className={cn(
            'shrink-0 inline-flex items-center gap-2 bg-card text-primary font-display font-semibold text-sm px-6 py-2 rounded-xl transition-colors',
            isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-card/90',
          )}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {buttonText}
        </button>
      </div>
    </div>
  )
}

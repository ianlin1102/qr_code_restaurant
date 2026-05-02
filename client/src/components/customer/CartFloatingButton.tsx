import { ShoppingCart, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useFloatingButtonState, type FloatingButtonVariant } from '@/hooks/useFloatingButtonState'

interface CartFloatingButtonProps {
  onSettleClick: () => void
  currentLang?: 'zh' | 'en'
}

const labels = {
  zh: { cart: '购物车', addMore: '加单', settle: '结账', empty: '点菜' },
  en: { cart: 'Cart', addMore: 'Add More', settle: 'Settle', empty: 'Menu' },
} as const

type VariantConfig = {
  icon: typeof ShoppingCart
  labelKey: keyof typeof labels.en
  bg: string
  color: string
}

const variantConfig: Record<FloatingButtonVariant, VariantConfig> = {
  'goto-cart':   { icon: ShoppingCart, labelKey: 'cart',    bg: 'bg-primary',    color: 'text-primary-foreground' },
  'add-more':    { icon: ShoppingCart, labelKey: 'addMore', bg: 'bg-primary',    color: 'text-primary-foreground' },
  'settle':      { icon: Wallet,       labelKey: 'settle',  bg: 'bg-orange-500', color: 'text-white' },
  'empty-clean': { icon: ShoppingCart, labelKey: 'empty',   bg: 'bg-primary',    color: 'text-primary-foreground' },
}

export default function CartFloatingButton({
  onSettleClick,
  currentLang = 'en',
}: CartFloatingButtonProps) {
  const navigate = useNavigate()
  const { variant, cartCount } = useFloatingButtonState()
  const L = labels[currentLang]

  const config = variantConfig[variant]
  const Icon = config.icon
  const label = L[config.labelKey]
  const showBadge = cartCount > 0
  const badgeText = cartCount > 99 ? '99+' : String(cartCount)

  const handleClick = () => {
    if (variant === 'settle') {
      onSettleClick()
    } else {
      navigate('/cart')
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={cn(
        'fixed right-4 z-30 transition-all duration-200',
        'bottom-4 [bottom:max(1rem,env(safe-area-inset-bottom))]',
        'flex items-center gap-2 pl-4 pr-5 h-14 rounded-full shadow-lg',
        'font-display font-medium',
        config.bg,
        config.color,
        'hover:scale-105 active:scale-95',
      )}
    >
      <div className="relative">
        <Icon className="h-5 w-5" />
        {showBadge && (
          <span
            className={cn(
              'absolute -top-2 -right-3 bg-white text-primary',
              'border-2 border-primary',
              'text-[10px] font-bold min-w-5 h-5 px-1 rounded-full',
              'flex items-center justify-center',
            )}
          >
            {badgeText}
          </span>
        )}
      </div>
      <span className="text-sm">{label}</span>
    </button>
  )
}

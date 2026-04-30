import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ShoppingCart, UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  storeId: string
  cartItemCount: number
  currentLang?: 'zh' | 'en'
}

const labels = {
  zh: { menu: '菜单', cart: '购物车', nav: '主导航' },
  en: { menu: 'Menu', cart: 'Cart', nav: 'Primary navigation' },
} as const

export default function BottomNav({ storeId, cartItemCount, currentLang = 'en' }: BottomNavProps) {
  const location = useLocation()
  const L = labels[currentLang]

  const isMenuActive = location.pathname.startsWith('/menu/')
  const isCartActive = location.pathname === '/cart'

  const badgeText = cartItemCount > 99 ? '99+' : String(cartItemCount)

  // Bounce when count increases (decrement / no-change does nothing).
  const [bouncing, setBouncing] = useState(false)
  const prevCountRef = useRef(cartItemCount)
  const bounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (cartItemCount > prevCountRef.current) {
      setBouncing(true)
      if (bounceTimeoutRef.current) clearTimeout(bounceTimeoutRef.current)
      bounceTimeoutRef.current = setTimeout(() => setBouncing(false), 300)
    }
    prevCountRef.current = cartItemCount
    return () => {
      if (bounceTimeoutRef.current) clearTimeout(bounceTimeoutRef.current)
    }
  }, [cartItemCount])

  const tabClass = (active: boolean) =>
    cn(
      'flex flex-col items-center justify-center gap-0.5 px-6 py-1 rounded-lg transition-colors',
      active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50',
    )

  return (
    <nav
      aria-label={L.nav}
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 bg-card border-t border-border h-20 pb-safe"
    >
      <div className="flex justify-around items-center h-full px-4">
        <Link
          to={`/menu/${storeId}`}
          aria-current={isMenuActive ? 'page' : undefined}
          aria-label={L.menu}
          className={tabClass(isMenuActive)}
        >
          <UtensilsCrossed className="h-5 w-5" />
          <span className="text-xs font-display font-medium">{L.menu}</span>
        </Link>

        <Link
          to="/cart"
          aria-current={isCartActive ? 'page' : undefined}
          aria-label={L.cart}
          className={tabClass(isCartActive)}
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center transition-transform duration-200',
                  bouncing && 'scale-125',
                )}
              >
                {badgeText}
              </span>
            )}
          </div>
          <span className="text-xs font-display font-medium">{L.cart}</span>
        </Link>
      </div>
    </nav>
  )
}

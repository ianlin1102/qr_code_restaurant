import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { unitPrice, type CartEntry } from '@/stores/cart-store'
import { formatPriceUSD } from '@/lib/format'
import { optionLabel } from '@/lib/i18n-utils'

interface CartItemCardProps {
  item: CartEntry
  isOwn: boolean
  updateQuantity: (cartKey: string, quantity: number) => void
  updateRemark: (cartKey: string, remark: string) => void
  t: (key: string, opts?: Record<string, unknown>) => string
}

export default function CartItemCard({
  item,
  isOwn,
  updateQuantity,
  updateRemark,
  t,
}: CartItemCardProps) {
  const price = unitPrice(item)
  return (
    <div className="bg-card rounded-xl p-3 md:p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-full bg-muted/50 shrink-0 flex items-center justify-center text-lg font-display">
          {item.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-medium truncate">{item.name}</p>
          {item.selectedOptions && item.selectedOptions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.selectedOptions.map(opt => (
                <Badge
                  key={opt.optionId}
                  variant="outline"
                  className="text-xs rounded-full bg-primary/10 border-primary/20 text-primary"
                >
                  {optionLabel(opt)}
                  {opt.priceAdjust > 0 && ` +${formatPriceUSD(opt.priceAdjust)}`}
                </Badge>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            {formatPriceUSD(price)} {t('cart.perServing')}
          </p>
        </div>
        <p className="font-display font-bold whitespace-nowrap">
          {formatPriceUSD(price * item.quantity)}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-xl"
            onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}
            disabled={!isOwn}
          >
            {item.quantity === 1 ? (
              <Trash2 className="h-4 w-4 text-destructive" />
            ) : (
              <Minus className="h-4 w-4" />
            )}
          </Button>
          <span className="w-8 text-center font-medium">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-xl"
            onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
            disabled={!isOwn}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Input
        placeholder={t('cart.remarkPlaceholder')}
        value={item.remark ?? ''}
        onChange={(e) => updateRemark(item.cartKey, e.target.value)}
        className="text-base"
        disabled={!isOwn}
      />
    </div>
  )
}

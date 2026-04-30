import { useState, useRef, useEffect } from 'react'
import type { MouseEvent } from 'react'
import { Check, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatPriceUSD } from '@/lib/format'
import { localized, localizedDesc } from '@/lib/i18n-utils'
import { DietaryBadges, RecommendedBadge } from '@/components/menu/MenuItemBadges'
import type { MenuItem } from '@qr-order/shared'

interface DishCardProps {
  item: MenuItem
  onAddClick: () => void
  onCardClick?: () => void
  addAnimating?: boolean
  currentLang?: 'zh' | 'en'
}

const labels = {
  zh: { add: '添加', added: '已添加', soldOut: '售罄' },
  en: { add: 'Add', added: 'Added', soldOut: 'Sold Out' },
} as const

/** 600ms add-success visual feedback hook (Plus → Check, navy → green, scale-up). */
function useAddSuccess() {
  const [showSuccess, setShowSuccess] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])
  const trigger = () => {
    setShowSuccess(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setShowSuccess(false), 600)
  }
  return { showSuccess, trigger }
}

export default function DishCard(props: DishCardProps) {
  if (props.item.isRecommended) return <DishCardHighlight {...props} />
  return <DishCardCompact {...props} />
}

function DishCardHighlight({ item, onAddClick, onCardClick, currentLang = 'en' }: DishCardProps) {
  const L = labels[currentLang]
  const name = localized(item, currentLang)
  const desc = localizedDesc(item, currentLang)
  const quickTag = item.quickTags?.[0]
  const isAvailable = item.available
  const { showSuccess, trigger } = useAddSuccess()

  const handleAdd = (e: MouseEvent) => {
    e.stopPropagation()
    if (!isAvailable) return
    onAddClick()
    trigger()
  }

  return (
    <article
      role="button"
      tabIndex={isAvailable ? 0 : -1}
      onClick={isAvailable ? onCardClick : undefined}
      aria-label={`${name} ${formatPriceUSD(item.price)}`}
      className={cn(
        'group bg-card rounded-xl border border-border overflow-hidden flex flex-col transition-all duration-300 hover:shadow-lg cursor-pointer',
        !isAvailable && 'opacity-60 cursor-not-allowed',
      )}
    >
      <div className="aspect-[4/3] w-full relative overflow-hidden bg-muted">
        {item.image ? (
          <img
            src={item.image}
            alt={name}
            className={cn(
              'w-full h-full object-cover transition-transform duration-500 group-hover:scale-105',
              !isAvailable && 'grayscale',
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground">
            {name.charAt(0)}
          </div>
        )}
        {quickTag && isAvailable && (
          <div className="absolute top-3 left-3">
            <span className="bg-card/90 backdrop-blur-sm text-primary font-label text-label-sm rounded-lg px-2 py-1">
              {quickTag}
            </span>
          </div>
        )}
        {!isAvailable && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <span className="bg-red-600 text-white text-xs font-bold px-8 py-1 -rotate-12 uppercase">
              {L.soldOut}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 flex-grow flex flex-col">
        <h3 className="font-display text-dish-name text-foreground mb-1 line-clamp-2">{name}</h3>
        <DietaryBadges item={item} className="mb-2" />
        {desc && <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{desc}</p>}
        <div className="flex justify-between items-center mt-auto">
          <div className="flex items-baseline gap-2">
            {item.originalPrice && item.originalPrice > item.price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPriceUSD(item.originalPrice)}
              </span>
            )}
            <span className="font-display text-price-tag text-primary">
              {formatPriceUSD(item.price)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!isAvailable}
            aria-label={showSuccess ? `${L.added} ${name}` : `${L.add} ${name}`}
            aria-live="polite"
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
              showSuccess
                ? 'bg-green-500 text-white scale-110'
                : 'bg-primary text-primary-foreground',
              !showSuccess && isAvailable && 'hover:bg-primary/90 active:scale-95',
              !isAvailable && 'opacity-50 cursor-not-allowed',
            )}
          >
            {showSuccess ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </article>
  )
}

function DishCardCompact({ item, onAddClick, onCardClick, currentLang = 'en' }: DishCardProps) {
  const L = labels[currentLang]
  const name = localized(item, currentLang)
  const desc = localizedDesc(item, currentLang)
  const isAvailable = item.available
  const hasOptions = item.options && item.options.length > 0
  const hasDiscount = item.originalPrice && item.originalPrice > item.price
  const { showSuccess, trigger } = useAddSuccess()

  const handleAdd = (e: MouseEvent) => {
    e.stopPropagation()
    if (!isAvailable) return
    onAddClick()
    trigger()
  }

  return (
    <article
      role="button"
      tabIndex={isAvailable ? 0 : -1}
      onClick={isAvailable ? onCardClick : undefined}
      aria-label={`${name} ${formatPriceUSD(item.price)}`}
      className={cn(
        'group relative bg-card rounded-xl border border-border overflow-hidden flex items-center p-2.5 gap-3 hover:shadow-md transition-shadow cursor-pointer',
        !isAvailable && 'opacity-60 cursor-not-allowed',
      )}
    >
      {item.isRecommended && isAvailable && <RecommendedBadge />}
      <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
        {item.image ? (
          <img
            src={item.image}
            alt={name}
            className={cn('w-full h-full object-cover', !isAvailable && 'grayscale')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground">
            {name.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-[16px] font-semibold text-foreground line-clamp-1">{name}</h3>
        <DietaryBadges item={item} className="mt-1" />
        {desc && <p className="text-muted-foreground text-sm line-clamp-1 mt-0.5">{desc}</p>}
        {hasOptions && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {item.options!.map((o) => localized(o, currentLang)).join(' / ')}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <div className="flex items-baseline gap-1.5">
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPriceUSD(item.originalPrice!)}
            </span>
          )}
          <span className="font-display text-[16px] font-bold text-primary">
            {formatPriceUSD(item.price)}
          </span>
        </div>
        {hasDiscount && (
          <Badge className="bg-red-100 text-red-600 border-0 text-[10px] px-1 py-0">
            {Math.round((1 - item.price / item.originalPrice!) * 100)}% OFF
          </Badge>
        )}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!isAvailable}
          aria-label={showSuccess ? `${L.added} ${name}` : `${L.add} ${name}`}
          aria-live="polite"
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
            showSuccess
              ? 'bg-green-500 text-white scale-110'
              : 'bg-primary text-primary-foreground',
            !showSuccess && isAvailable && 'hover:bg-primary/90 active:scale-95',
            !isAvailable && 'opacity-50 cursor-not-allowed',
          )}
        >
          {showSuccess ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>
      {!isAvailable && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <span className="bg-red-600 text-white text-xs font-bold px-8 py-0.5 -rotate-12 uppercase">
            {L.soldOut}
          </span>
        </div>
      )}
    </article>
  )
}

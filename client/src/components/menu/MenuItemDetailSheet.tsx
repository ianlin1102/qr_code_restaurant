import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCartStore } from '@/stores/cart-store'
import { formatPriceUSD } from '@/lib/format'
import { itemUnitPrice } from '@/lib/pricing'
import { localized, localizedDesc } from '@/lib/i18n-utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { MenuItem, Category, SelectedOption } from '@qr-order/shared'
import { DietaryBadges } from '@/components/menu/MenuItemBadges'

const QUICK_TAGS_ZH = ['不要葱', '少辣', '多酱', '不要味精', '少盐', '少油']
const QUICK_TAGS_EN = ['No Onions', 'Less Spicy', 'Extra Sauce', 'No MSG', 'Less Salt', 'Less Oil']

interface Props {
  item: MenuItem | null
  category?: Category
  open: boolean
  onClose: () => void
}

export default function MenuItemDetailSheet({ item, category, open, onClose }: Props) {
  const { t, i18n } = useTranslation('customer')
  const lang = i18n.language
  const addItem = useCartStore(s => s.addItem)

  const [selectedOptions, setSelectedOptions] = useState<Record<string, SelectedOption>>({})
  const [quickTags, setQuickTags] = useState<string[]>([])
  const [remark, setRemark] = useState('')
  const [quantity, setQuantity] = useState(1)

  // Reset state when item changes or sheet opens
  useEffect(() => {
    if (open) {
      setSelectedOptions({})
      setQuickTags([])
      setRemark('')
      setQuantity(1)
    }
  }, [open, item?.id])

  if (!item) return null

  const itemQuickTags = item.quickTags
  const categoryQuickTags = category?.quickTags
  const hideTagsSection = category?.hideQuickTags === true
  const defaultTags = lang === 'en' ? QUICK_TAGS_EN : QUICK_TAGS_ZH
  const tags =
    itemQuickTags && itemQuickTags.length > 0
      ? itemQuickTags
      : categoryQuickTags && categoryQuickTags.length > 0
      ? categoryQuickTags
      : defaultTags

  const toggleTag = (tag: string) => {
    setQuickTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
    )
  }

  const handleSelectChoice = (
    optionId: string, optionName: string,
    choiceId: string, choiceName: string, priceAdjust: number,
  ) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionId]: { optionId, optionName, choiceId, choiceName, priceAdjust },
    }))
  }

  const allRequiredSelected = (): boolean => {
    if (!item.options) return true
    return item.options.filter(o => o.required).every(o => selectedOptions[o.id])
  }

  const unitTotal = itemUnitPrice({ price: item.price, quantity: 1, selectedOptions: Object.values(selectedOptions) })
  const totalPrice = unitTotal * quantity

  const handleAdd = () => {
    const opts = Object.values(selectedOptions)
    const remarkParts: string[] = []
    if (quickTags.length > 0) remarkParts.push(quickTags.join(', '))
    if (remark.trim()) remarkParts.push(remark.trim())
    const combinedRemark = remarkParts.join(' | ') || undefined

    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity,
      selectedOptions: opts.length > 0 ? opts : undefined,
      remark: combinedRemark,
    })
    onClose()
  }

  const description = localizedDesc(item, lang)
  const hasOptions = item.options && item.options.length > 0

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto pb-safe p-0">
        {/* Image section */}
        {item.image ? (
          <img
            src={item.image}
            alt={localized(item, lang)}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-5xl font-bold text-primary/40">
              {localized(item, lang).charAt(0)}
            </span>
          </div>
        )}

        <div className="px-4 pb-4 space-y-4">
          {/* Name + description */}
          <SheetHeader className="pt-3">
            <SheetTitle className="text-left text-lg">
              {localized(item, lang)}
            </SheetTitle>
            <DietaryBadges item={item} showLabel className="pt-0.5" />
            {description && (
              <p className="text-sm text-muted-foreground text-left">{description}</p>
            )}
            <div className="flex items-center gap-2 text-left">
              {item.originalPrice && item.originalPrice > item.price && (
                <span className="text-sm text-muted-foreground line-through">{formatPriceUSD(item.originalPrice)}</span>
              )}
              <span className="text-base font-semibold text-primary">{formatPriceUSD(item.price)}</span>
              {item.originalPrice && item.originalPrice > item.price && (
                <Badge className="bg-red-100 text-red-600 border-0 text-[10px] px-1.5 py-0">
                  {Math.round((1 - item.price / item.originalPrice) * 100)}% OFF
                </Badge>
              )}
              {hasOptions && (
                <span className="text-xs font-normal text-muted-foreground">
                  {t('menu.from')}
                </span>
              )}
            </div>
          </SheetHeader>

          <Separator />

          {/* Quick tags */}
          {!hideTagsSection && tags.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">{t('menu.quickTags')}</p>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-2 min-h-[36px] rounded-full text-xs border transition-colors ${
                      quickTags.includes(tag)
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-gray-200 text-muted-foreground hover:border-gray-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Option groups */}
          {hasOptions && item.options!.map(option => (
            <div key={option.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold">{localized(option, lang)}</span>
                {option.required && (
                  <Badge variant="destructive" className="text-xs px-1 py-0">
                    {t('menu.required')}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {option.choices.map(choice => {
                  const isSelected = selectedOptions[option.id]?.choiceId === choice.id
                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleSelectChoice(
                        option.id, option.name, choice.id, choice.name, choice.priceAdjust,
                      )}
                      className={`px-4 py-3 min-h-[44px] rounded-lg border text-sm transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {localized(choice, lang)}
                      {choice.priceAdjust > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          +{formatPriceUSD(choice.priceAdjust)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <Separator className="mt-3" />
            </div>
          ))}

          {/* Remark */}
          <div>
            <Textarea
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder={t('cart.remarkPlaceholder')}
              className="resize-none text-sm"
              rows={2}
            />
          </div>

          {/* Quantity selector + Add button */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="h-11 w-11 p-0 rounded-full"
                disabled={quantity <= 1}
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
              >
                -
              </Button>
              <span className="text-lg font-semibold w-6 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-11 w-11 p-0 rounded-full"
                onClick={() => setQuantity(q => q + 1)}
              >
                +
              </Button>
            </div>
            <Button
              onClick={handleAdd}
              disabled={!allRequiredSelected()}
              className="px-6 min-h-[44px]"
            >
              {t('menu.addToCart')} {formatPriceUSD(totalPrice)}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

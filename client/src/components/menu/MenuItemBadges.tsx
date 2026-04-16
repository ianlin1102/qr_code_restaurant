import { useTranslation } from 'react-i18next'
import type { MenuItem } from '@qr-order/shared'
import { DIETARY_TAGS, DIETARY_META } from '@/lib/dietary'
import { cn } from '@/lib/utils'

export function DietaryBadges({ item, showLabel = false, className }: { item: MenuItem; showLabel?: boolean; className?: string }) {
  const { t } = useTranslation('customer')
  const tags = DIETARY_TAGS.filter(tag => item.dietary?.includes(tag))
  if (tags.length === 0) return null
  return (
    <div className={cn('flex flex-wrap items-center', showLabel ? 'gap-1.5' : 'gap-1', className)}>
      {tags.map(tag => {
        const meta = DIETARY_META[tag]
        const Icon = meta.icon
        const label = t(`menu.dietary.${tag}`)
        if (showLabel) {
          return (
            <span key={tag} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs', meta.bg, meta.color)}>
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{label}</span>
            </span>
          )
        }
        return (
          <span key={tag} title={label} className={cn('inline-flex items-center rounded-sm p-0.5', meta.bg)}>
            <Icon className={cn('h-3 w-3', meta.color)} aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </span>
        )
      })}
    </div>
  )
}

export function RecommendedBadge({ className }: { className?: string }) {
  const { t } = useTranslation('customer')
  return (
    <span className={cn('absolute top-0 left-0 z-20 bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-tl-lg rounded-br-md shadow-sm', className)}>
      {t('menu.recommended')}
    </span>
  )
}

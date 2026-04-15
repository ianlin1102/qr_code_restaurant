import type { DietaryTag } from '@qr-order/shared'
import { DIETARY_TAGS } from '@qr-order/shared'
import { Leaf, Sprout, Wheat, Nut, Flame, Milk, type LucideIcon } from 'lucide-react'

export { DIETARY_TAGS }

export const DIETARY_META: Record<DietaryTag, { icon: LucideIcon; color: string; bg: string }> = {
  vegetarian:      { icon: Leaf,   color: 'text-green-700',  bg: 'bg-green-100' },
  vegan:           { icon: Sprout, color: 'text-green-800',  bg: 'bg-green-100' },
  'gluten-free':   { icon: Wheat,  color: 'text-amber-700',  bg: 'bg-amber-100' },
  'contains-nuts': { icon: Nut,    color: 'text-orange-800', bg: 'bg-orange-100' },
  spicy:           { icon: Flame,  color: 'text-red-700',    bg: 'bg-red-100' },
  'dairy-free':    { icon: Milk,   color: 'text-sky-700',    bg: 'bg-sky-100' },
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { safeStorage } from '@/lib/safe-storage'
import { getDeviceId } from '@/lib/device-id'
import { useSessionStore } from './session-store'
import type { CartItem } from '@qr-order/shared'
import { unitPrice as calcUnitPrice } from '@qr-order/shared/pricing'

/**
 * Cart match key design rationale (post a58930a7 fix)
 *
 * Cart items are matched (for quantity merging in addItem) by a 3-tuple:
 *   - menuItemId
 *   - sortedSelectedOptions (structured choices: 辣度 / 份量 / etc)
 *   - trimmedRemark (free-text: quick tags joined + custom 备注)
 *
 * History: original logic matched only on menuItemId + selectedOptions,
 * causing silent remark loss when same dish was added with different
 * quick tags (e.g. 冰红茶 + "不要加盐" merged with 冰红茶 + "不要加味精"
 * → second remark dropped via the spread operator in the merge branch).
 *
 * Rule: any user-visible distinguishing field MUST be in the match key.
 *
 * See CLAUDE.md "设计约束 / Design Constraints" for the general principle.
 */

/** Calculate unit price (base + all option adjustments) */
export function unitPrice(item: CartItem): number {
  return calcUnitPrice({
    price: item.price,
    quantity: item.quantity,
    options: item.selectedOptions?.map(o => ({ priceAdjust: o.priceAdjust })),
  })
}

// Extend CartItem with a cartKey for internal tracking
export type CartEntry = CartItem & { cartKey: string }

interface CartState {
  items: CartEntry[]
  cartVersion: number            // synced from server on poll
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeItem: (cartKey: string) => void
  updateQuantity: (cartKey: string, quantity: number) => void
  updateRemark: (cartKey: string, remark: string) => void
  clearCart: () => void
  clearMyItems: () => void      // remove only items added by this device
  setCartVersion: (v: number) => void
  totalPrice: () => number
  totalItems: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
  items: [],
  cartVersion: 0,

  addItem: (item) => set(state => {
    const serializeOpts = (opts?: typeof item.selectedOptions) =>
      JSON.stringify(
        (opts ?? [])
          .map(o => ({ optionId: o.optionId, choiceId: o.choiceId }))
          .sort((a, b) => a.optionId.localeCompare(b.optionId)),
      )
    const optsKey = serializeOpts(item.selectedOptions)
    // Normalize remark: undefined / empty / whitespace-only collapse to ''.
    // Without this, items with different remarks ("ice" vs "warm") would
    // merge by menuItemId+options match alone, dropping the second remark.
    const remarkKey = (item.remark ?? '').trim()
    const existing = state.items.find(i =>
      i.menuItemId === item.menuItemId &&
      serializeOpts(i.selectedOptions) === optsKey &&
      (i.remark ?? '').trim() === remarkKey,
    )
    if (existing) {
      return {
        items: state.items.map(i =>
          i.cartKey === existing.cartKey
            ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
            : i,
        ),
      }
    }
    const key = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const deviceId = getDeviceId()
    const displayName = useSessionStore.getState().customerName || undefined
    return {
      items: [...state.items, {
        ...item,
        quantity: item.quantity ?? 1,
        cartKey: key,
        addedBy: item.addedBy ?? displayName,
        addedByDevice: item.addedByDevice ?? deviceId,
      }],
    }
  }),

  removeItem: (cartKey) => set(state => ({
    items: state.items.filter(i => i.cartKey !== cartKey)
  })),

  updateQuantity: (cartKey, quantity) => set(state => {
    if (quantity <= 0) {
      return { items: state.items.filter(i => i.cartKey !== cartKey) }
    }
    return {
      items: state.items.map(i =>
        i.cartKey === cartKey ? { ...i, quantity } : i
      )
    }
  }),

  updateRemark: (cartKey, remark) => set(state => ({
    items: state.items.map(i =>
      i.cartKey === cartKey ? { ...i, remark } : i
    )
  })),

  clearCart: () => set({ items: [] }),
  clearMyItems: () => set(state => ({
    items: state.items.filter(i => i.addedByDevice !== getDeviceId()),
  })),
  setCartVersion: (v) => set({ cartVersion: v }),

  totalPrice: () => get().items.reduce((sum, i) => sum + unitPrice(i) * i.quantity, 0),

  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'qr-order-cart', storage: safeStorage as any }
  )
)

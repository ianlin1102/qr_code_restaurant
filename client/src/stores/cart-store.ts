import { create } from 'zustand'
import type { CartItem } from '@qr-order/shared'

/** Calculate unit price (base + all option adjustments) */
export function unitPrice(item: CartItem): number {
  const adjust = (item.selectedOptions ?? []).reduce((sum, o) => sum + o.priceAdjust, 0)
  return item.price + adjust
}

// Extend CartItem with a cartKey for internal tracking
export type CartEntry = CartItem & { cartKey: string }

interface CartState {
  items: CartEntry[]
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeItem: (cartKey: string) => void
  updateQuantity: (cartKey: string, quantity: number) => void
  updateRemark: (cartKey: string, remark: string) => void
  clearCart: () => void
  totalPrice: () => number
  totalItems: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) => set(state => {
    const optsKey = JSON.stringify(
      (item.selectedOptions ?? [])
        .map(o => ({ optionId: o.optionId, choiceId: o.choiceId }))
        .sort((a, b) => a.optionId.localeCompare(b.optionId)),
    )
    const existing = state.items.find(
      i => i.menuItemId === item.menuItemId && JSON.stringify(
        (i.selectedOptions ?? [])
          .map(o => ({ optionId: o.optionId, choiceId: o.choiceId }))
          .sort((a, b) => a.optionId.localeCompare(b.optionId)),
      ) === optsKey,
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
    return {
      items: [...state.items, { ...item, quantity: item.quantity ?? 1, cartKey: key }],
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

  totalPrice: () => get().items.reduce((sum, i) => sum + unitPrice(i) * i.quantity, 0),

  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}))

import { create } from 'zustand'
import type { CartItem, SelectedOption } from '@qr-order/shared'

/** Generate a unique key for a cart item based on menuItemId + selected options */
export function cartItemKey(menuItemId: string, selectedOptions?: SelectedOption[]): string {
  if (!selectedOptions || selectedOptions.length === 0) return menuItemId
  const optKey = selectedOptions
    .map(o => `${o.optionId}:${o.choiceId}`)
    .sort()
    .join('|')
  return `${menuItemId}__${optKey}`
}

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
    const key = cartItemKey(item.menuItemId, item.selectedOptions)
    const existing = state.items.find(i => i.cartKey === key)
    if (existing) {
      return {
        items: state.items.map(i =>
          i.cartKey === key
            ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
            : i
        )
      }
    }
    return {
      items: [...state.items, { ...item, quantity: item.quantity ?? 1, cartKey: key }]
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

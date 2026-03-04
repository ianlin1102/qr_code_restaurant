import { create } from 'zustand'
import type { CartItem } from '@qr-order/shared'

interface CartState {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeItem: (menuItemId: string) => void
  updateQuantity: (menuItemId: string, quantity: number) => void
  updateRemark: (menuItemId: string, remark: string) => void
  clearCart: () => void
  totalPrice: () => number
  totalItems: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) => set(state => {
    const existing = state.items.find(i => i.menuItemId === item.menuItemId)
    if (existing) {
      return {
        items: state.items.map(i =>
          i.menuItemId === item.menuItemId
            ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
            : i
        )
      }
    }
    return { items: [...state.items, { ...item, quantity: item.quantity ?? 1 }] }
  }),

  removeItem: (menuItemId) => set(state => ({
    items: state.items.filter(i => i.menuItemId !== menuItemId)
  })),

  updateQuantity: (menuItemId, quantity) => set(state => {
    if (quantity <= 0) {
      return { items: state.items.filter(i => i.menuItemId !== menuItemId) }
    }
    return {
      items: state.items.map(i =>
        i.menuItemId === menuItemId ? { ...i, quantity } : i
      )
    }
  }),

  updateRemark: (menuItemId, remark) => set(state => ({
    items: state.items.map(i =>
      i.menuItemId === menuItemId ? { ...i, remark } : i
    )
  })),

  clearCart: () => set({ items: [] }),

  totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}))
